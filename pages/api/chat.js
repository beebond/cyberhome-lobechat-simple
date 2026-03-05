import OpenAI from "openai";

// ======================= 配置 =======================
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 你的独立站域名（用于生成产品链接）
const STORE_URL = process.env.STORE_URL || "https://www.cyberhome.app";

// FAQ/Products 搜索服务（Railway 的 cyberhome-faq-api）
const FAQ_API_URL = process.env.FAQ_API_URL || ""; // e.g. https://cyberhome-faq-api-production.up.railway.app

// 记忆（按 sessionId 简单保留最近对话）
const conversationHistory = new Map();
const MAX_HISTORY_MESSAGES = 12;

// ======================= 工具函数 =======================
function safeText(s) {
  return String(s || "").replace(/\u0000/g, "").trim();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function nowISO() {
  return new Date().toISOString();
}

function normalize(s) {
  return safeText(s).toLowerCase().replace(/\s+/g, " ").trim();
}

function isProbablyChinese(s) {
  return /[\u4e00-\u9fff]/.test(s || "");
}

// 将产品列表渲染成「卡片 HTML」——用于 SimpleChat 前端直接显示
function formatProductCards(products = []) {
  if (!Array.isArray(products) || products.length === 0) return "";

  const cards = products
    .slice(0, 6)
    .map((p) => {
      const title = safeText(p.title || "Product");
      const model = safeText(p.product_id || p.model || "");
      const price = safeText(p.price || "");
      const imageUrl = safeText(p.image_url || "");

      // ✅ 关键修复：使用 handle 拼接产品链接（不要用 product_id）
      const handle = safeText(p.handle || "");
      const productUrl = handle ? `${STORE_URL}/products/${encodeURIComponent(handle)}` : STORE_URL;

      // ✅ Add to Cart：如果你未来在 products.json 里加入 variant_id，就能真正一键加购
      // 目前没有 variant_id 时，为了不误导，按钮仍然跳转到产品页
      const variantId = safeText(p.variant_id || "");
      const addToCartUrl = variantId
        ? `${STORE_URL}/cart/add?id=${encodeURIComponent(variantId)}&quantity=1`
        : productUrl;

      return `
<div style="border:1px solid #eee;border-radius:12px;padding:12px;margin:10px 0;background:#fff;">
  <div style="display:flex;gap:12px;align-items:flex-start;">
    <div style="width:64px;height:64px;border-radius:10px;background:#f5f5f5;overflow:hidden;flex:0 0 64px;">
      ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;"/>` : ""}
    </div>
    <div style="flex:1;">
      <div style="font-weight:700;font-size:14px;line-height:1.3;">${title}</div>
      ${model ? `<div style="color:#666;font-size:12px;margin-top:2px;">Model: ${model}</div>` : ""}
      ${price ? `<div style="color:#d97706;font-weight:700;margin-top:6px;">${price}</div>` : ""}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <a href="${productUrl}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;padding:8px 10px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-size:12px;">
          View Details
        </a>
        <a href="${addToCartUrl}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;padding:8px 10px;border-radius:8px;background:#10b981;color:#fff;text-decoration:none;font-size:12px;">
          Add to Cart
        </a>
      </div>
    </div>
  </div>
</div>`.trim();
    })
    .join("\n");

  return cards;
}

// ======================= AI：意图判断 & 生成 =======================

// 用 AI 判断：本轮更像 “FAQ/政策/配送/售后” 还是 “产品咨询/推荐/对比”
// 注意：我们把“订单查询/售后”也归为 FAQ（后续你可以再拆得更细）
async function detectIntent(userMessage, historyMessages = []) {
  const msg = safeText(userMessage);
  const lang = isProbablyChinese(msg) ? "zh" : "en";

  const system = `
You are an intent classifier for an e-commerce support chatbot.

Return ONLY valid JSON with keys:
- intent: one of ["faq","product","mixed","other"]
- wants_products: boolean (should we show product cards)
- reason: short string

Rules:
- shipping/country coverage, payments, taxes, policies, returns/refunds, warranty, contact, voltage, compatibility, order issues => faq
- product features, comparisons, recommendations, accessories, "do you have X", "which one should I buy" => product
- if user asks both policy+product => mixed
- wants_products true ONLY if user intent is product or mixed and the user likely benefits from seeing products.
Do not include any extra text.
`.trim();

  const recent = historyMessages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_INTENT_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: system },
      ...recent,
      { role: "user", content: msg },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  try {
    const obj = JSON.parse(raw);
    const intent = ["faq", "product", "mixed", "other"].includes(obj.intent) ? obj.intent : "other";
    return {
      intent,
      wants_products: Boolean(obj.wants_products),
      reason: safeText(obj.reason || ""),
      lang,
    };
  } catch (e) {
    // fallback：简单规则
    const t = normalize(msg);
    const faqHit = /(ship|shipping|return|refund|warranty|policy|contact|voltage|deliver|delivery|mexico|canada|us|usa|payment|tax)/.test(t);
    const prodHit = /(recommend|compare|difference|which|model|accessory|jar|yogurt|air fryer|steamer|blender|buy)/.test(t);
    const intent = faqHit && prodHit ? "mixed" : faqHit ? "faq" : prodHit ? "product" : "other";
    return { intent, wants_products: intent !== "faq", reason: "fallback", lang };
  }
}

// 用 AI 把检索结果（FAQ/产品）“组合+润色”成自然回答
async function generateAnswer({ userMessage, historyMessages, intentInfo, faqMatches, productMatches }) {
  const lang = intentInfo.lang === "zh" ? "Chinese" : "English";

  const faqBlock =
    (faqMatches || [])
      .slice(0, 6)
      .map((f, i) => `FAQ${i + 1}\nQ: ${safeText(f.question)}\nA: ${safeText(f.answer)}\nTags: ${(f.tags || []).join(", ")}`)
      .join("\n\n") || "None";

  const productBlock =
    (productMatches || [])
      .slice(0, 6)
      .map((p, i) => `P${i + 1}\nTitle: ${safeText(p.title)}\nHandle: ${safeText(p.handle)}\nModel: ${safeText(p.product_id)}\nPrice: ${safeText(p.price)}\nDesc: ${safeText(p.short_description)}`)
      .join("\n\n") || "None";

  const system = `
You are CyberHome Support, an e-commerce assistant for cyberhome.app.

Goal:
- Answer the user's question accurately and helpfully.
- You MUST rely on the provided FAQ and Product snippets. If information is missing, say what is missing and suggest the best next step (e.g., provide order number, or check a specific policy page).
- Do NOT invent policies, shipping countries, warranty terms, certifications, or prices beyond the provided snippets.
- Keep the answer concise and friendly.

Formatting:
- Reply in ${lang}.
- If recommending products, mention up to 3 items max, and keep it consistent with the products list provided.
- Do not include raw JSON.
`.trim();

  const user = `
User question:
${safeText(userMessage)}

Detected intent: ${intentInfo.intent}

FAQ snippets:
${faqBlock}

Product snippets:
${productBlock}
`.trim();

  const recent = historyMessages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    temperature: 0.2, // 稳定一些，但不死板
    messages: [
      { role: "system", content: system },
      ...recent,
      { role: "user", content: user },
    ],
  });

  return safeText(resp.choices?.[0]?.message?.content || "");
}

// ======================= 主 API =======================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userMessage = safeText(req.body?.message || "");
    const sessionId = safeText(req.body?.sessionId || "default");

    if (!userMessage) {
      return res.status(400).json({ error: "Missing message" });
    }

    // 取历史
    const history = conversationHistory.get(sessionId) || [];

    // 1) 意图识别（优先级最高，解决“上一轮是产品，下一轮问政策仍然推产品”的问题）
    const intentInfo = await detectIntent(userMessage, history);

    // 2) 检索（FAQ API）
    let faqMatches = [];
    let productMatches = [];

    if (FAQ_API_URL) {
      // chat.js 兼容你当前的 FAQ API（POST /api/search）
      const searchResp = await fetch(`${FAQ_API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          limitFaq: 6,
          limitProducts: intentInfo.wants_products ? 8 : 0,
        }),
      });

      const searchData = await searchResp.json().catch(() => ({}));
      faqMatches = Array.isArray(searchData.faqMatches) ? searchData.faqMatches : [];
      productMatches = Array.isArray(searchData.productMatches) ? searchData.productMatches : [];
    }

    // 3) 生成回答（从检索结果中抽取要点再润色）
    const answerText = await generateAnswer({
      userMessage,
      historyMessages: history,
      intentInfo,
      faqMatches,
      productMatches,
    });

    // 4) 是否输出产品卡片（严格受 intent 控制）
    const showCards = intentInfo.wants_products && Array.isArray(productMatches) && productMatches.length > 0;
    const cardsHtml = showCards ? formatProductCards(productMatches) : "";

    const finalResponse = showCards
      ? `${answerText}\n\n<div style="margin-top:10px;"><strong>Related Products</strong></div>\n${cardsHtml}`
      : answerText;

    // 5) 更新历史（保留最近 N 条）
    const newHistory = [
      ...history,
      { role: "user", content: userMessage },
      { role: "assistant", content: answerText },
    ].slice(-MAX_HISTORY_MESSAGES);

    conversationHistory.set(sessionId, newHistory);

    return res.status(200).json({
      response: finalResponse,
      hasProducts: Boolean(showCards),
      intent: intentInfo.intent,
      timestamp: nowISO(),
      sessionId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error?.message || String(error),
    });
  }
}

// pages/api/chat.js
// CyberHome LobeChat - AI chat API (Next.js API Route)
//
// Key rules implemented:
// 1) Product URLs use product.handle (NOT product_id).
// 2) Show at most 3 product cards.
// 3) Only show product cards where product.stock_status === "in_stock".
// 4) Prefer English responses for consistency.
// 5) Reduce irrelevant product mixing by scoring products against user query keywords.

import OpenAI from "openai";

// === Config ===
const FAQ_API_URL = (process.env.FAQ_API_URL || "").replace(/\/+$/, ""); // e.g. https://cyberhome-faq-api-production.up.railway.app
const STORE_BASE_URL = "https://www.cyberhome.app";

// Basic stopwords for keyword extraction
const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","when","where","what","which","who","whom","this","that","these","those",
  "is","are","was","were","be","been","being","do","does","did","can","could","should","would","may","might","must",
  "i","me","my","mine","you","your","yours","we","our","ours","they","their","theirs","he","his","she","her","it","its",
  "to","of","in","on","for","with","as","at","by","from","into","about","over","under","after","before","between","within",
  "please","hi","hello","thanks","thank"
]);

function safeJson(res) {
  return res.json().catch(() => null);
}

function ensureUrl(url) {
  if (!url) return "";
  // accept full URLs; otherwise assume missing scheme
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function extractKeywords(text) {
  const tokens = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  // de-dupe preserving order
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out.slice(0, 12);
}

function scoreProduct(product, keywords) {
  const hay = [
    product?.title,
    product?.type,
    product?.category,
    product?.handle,
    ...(Array.isArray(product?.tags) ? product.tags : [])
  ].filter(Boolean).join(" ").toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    // stronger weight for title matches
    if ((product?.title || "").toLowerCase().includes(kw)) score += 4;
    if (hay.includes(kw)) score += 1;
  }

  // boost if product seems to be the same category as question keywords
  if (keywords.some(k => ["yogurt","yoghurt","ferment","kefir"].includes(k)) && /yogurt|yoghurt/i.test(hay)) score += 3;
  if (keywords.some(k => ["rice","cooker"].includes(k)) && /rice\s*cooker/i.test(hay)) score += 3;
  if (keywords.some(k => ["steamer","steam"].includes(k)) && /steamer|steam/i.test(hay)) score += 2;
  if (keywords.some(k => ["blender","blend"].includes(k)) && /blender|blend/i.test(hay)) score += 2;

  // small penalty for accessories unless query hints accessory/parts
  const wantsParts = keywords.some(k => ["part","parts","replacement","accessory"].includes(k));
  const isAccessory = Array.isArray(product?.tags) && product.tags.some(t => /accessory|parts|replacement/i.test(String(t)));
  if (isAccessory && !wantsParts) score -= 2;

  return score;
}

function buildProductCard(product) {
  const handle = product?.handle || "";
  const productUrl = handle ? `${STORE_BASE_URL}/products/${handle}` : STORE_BASE_URL;
  // Without variant_id we can't guarantee a direct add-to-cart. Use product page as safest action.
  const cartUrl = productUrl;

  return {
    title: product?.title || "Product",
    model: product?.product_id || product?.type || "",
    price: typeof product?.price === "number" ? product.price : null,
    image_url: product?.image_url || "",
    product_url: productUrl,
    cart_url: cartUrl,
  };
}

async function searchFAQAndProducts(query) {
  if (!FAQ_API_URL) {
    return { faqMatches: [], productMatches: [] };
  }

  const url = `${ensureUrl(FAQ_API_URL)}/search`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`FAQ_API /search failed: ${resp.status} ${err}`.slice(0, 500));
  }

  const data = await safeJson(resp);
  return {
    faqMatches: Array.isArray(data?.faqMatches) ? data.faqMatches : [],
    productMatches: Array.isArray(data?.productMatches) ? data.productMatches : [],
  };
}

function pickBestFAQAnswer(faqMatches) {
  if (!Array.isArray(faqMatches) || faqMatches.length === 0) return null;
  // Expected fields: question, answer, tags, score (optional)
  // Prefer highest score if present; otherwise first.
  const sorted = [...faqMatches].sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  return sorted[0];
}

function pickTopProducts(productMatches, userMessage) {
  if (!Array.isArray(productMatches) || productMatches.length === 0) return [];
  const keywords = extractKeywords(userMessage);

  const filtered = productMatches
    .filter(p => (p?.stock_status || "").toLowerCase() === "in_stock")
    .filter(p => p?.handle); // must have handle to link

  const scored = filtered
    .map(p => ({ p, s: scoreProduct(p, keywords) }))
    .sort((a, b) => b.s - a.s);

  // Keep only meaningful matches (avoid random 0-score items) unless very few results
  const top = scored.filter(x => x.s >= 1).slice(0, 3);
  if (top.length > 0) return top.map(x => x.p);

  // fallback: still show up to 3 in-stock items
  return scored.slice(0, 3).map(x => x.p);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history } = req.body || {};
    const userMessage = String(message || "").trim();
    const chatHistory = Array.isArray(history) ? history : [];

    if (!userMessage) {
      return res.status(400).json({ error: "Missing message" });
    }

    // 1) Search local FAQ/Products service
    let faqMatches = [];
    let productMatches = [];
    try {
      const r = await searchFAQAndProducts(userMessage);
      faqMatches = r.faqMatches || [];
      productMatches = r.productMatches || [];
    } catch (e) {
      // Don't fail the whole chat if FAQ API is temporarily down
      console.error("FAQ/Products search error:", e?.message || e);
    }

    // 2) Build "context" blocks for the model
    const bestFAQ = pickBestFAQAnswer(faqMatches);
    const topProducts = pickTopProducts(productMatches, userMessage);
    const productCards = topProducts.map(buildProductCard);

    const faqContext = bestFAQ
      ? `FAQ match (use as ground truth, paraphrase naturally):\nQ: ${bestFAQ.question}\nA: ${bestFAQ.answer}`
      : "";

    const productsContext = topProducts.length
      ? `Relevant products (ONLY refer to these if the user is shopping for products):\n` +
        topProducts
          .map((p, idx) => {
            const url = p?.handle ? `${STORE_BASE_URL}/products/${p.handle}` : "";
            return `${idx + 1}. ${p?.title || "Product"} | handle: ${p?.handle || ""} | price: ${p?.price ?? ""} | url: ${url}`;
          })
          .join("\n")
      : "";

    // 3) Call OpenAI
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "You are CyberHome Support, an e-commerce assistant for CyberHome.app.",
      "Always reply in English for consistency (unless the user explicitly asks for another language).",
      "Be concise, helpful, and friendly.",
      "If the question is about store policy (shipping regions, voltage, returns, warranty, tracking, etc.), use the FAQ context as the source of truth and paraphrase it naturally.",
      "If the question is about products, ONLY recommend from the provided 'Relevant products' list. Do NOT mention other products.",
      "If there are no relevant products provided, do not invent products; instead, suggest browsing the appropriate collection or asking for preferences (but keep it brief).",
      "If the user asks something unrelated to CyberHome, politely steer back to store help.",
    ].join(" ");

    const messages = [
      { role: "system", content: systemPrompt },
      ...(faqContext ? [{ role: "system", content: faqContext }] : []),
      ...(productsContext ? [{ role: "system", content: productsContext }] : []),
      ...chatHistory.map(m => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: String(m?.content || ""),
      })),
      { role: "user", content: userMessage },
    ];

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.2, // lower temperature for more consistent answers
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";

    // 4) Response payload for UI
    // Only include product cards if the user appears to be shopping / asking about product availability.
    const userLooksForProducts = /\b(buy|price|recommend|suggest|looking for|do you have|available|yogurt maker|rice cooker|steamer|blender|air fryer|toaster)\b/i.test(userMessage);

    return res.status(200).json({
      answer,
      products: userLooksForProducts ? productCards : [],
      meta: {
        usedFAQ: Boolean(bestFAQ),
        productsCount: userLooksForProducts ? productCards.length : 0,
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

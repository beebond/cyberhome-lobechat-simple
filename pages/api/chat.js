import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORE_URL = (process.env.STORE_URL || "https://www.cyberhome.app").replace(/\/+$/, "");
let FAQ_API_URL = (process.env.FAQ_API_URL || "https://cyberhome-faq-api-production.up.railway.app").trim();
if (FAQ_API_URL && !/^https?:\/\//i.test(FAQ_API_URL)) {
  FAQ_API_URL = "https://" + FAQ_API_URL;
}
FAQ_API_URL = FAQ_API_URL.replace(/\/+$/, "");

const PRODUCT_INTENT_KEYWORDS = [
  "yogurt maker", "yogurt", "rice cooker", "rice roll steamer", "cheong fun", "blender",
  "air fryer", "sterilizer", "baby food maker", "humidifier", "toaster", "kettle",
  "steamer", "dough maker", "mixer", "clay pot", "replacement parts", "jar", "glass jar",
  "model", "recommend", "compare", "difference", "buy", "looking for", "do you have"
];

const STOPWORDS = new Set([
  "do", "you", "have", "the", "a", "an", "and", "or", "for", "with", "please", "some",
  "recommend", "show", "me", "i", "am", "looking", "to", "of", "on", "in", "is", "are",
  "sell", "need", "want", "product", "products", "bear", "brand", "machine", "electric",
  "appliance", "appliances"
]);

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function tokenize(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w));
}

function extractIntent(userMessage) {
  const q = normalizeText(userMessage);
  const isProductIntent =
    PRODUCT_INTENT_KEYWORDS.some((k) => q.includes(k)) ||
    /(recommend|compare|difference|looking for|do you have|which one|best)/i.test(userMessage);

  const asksPolicy =
    /(shipping|ship|delivery|warranty|return|refund|voltage|canada|mexico|policy|support|contact)/i.test(userMessage);

  return { isProductIntent, asksPolicy };
}

function productUrl(handle) {
  if (!handle) return STORE_URL;
  if (/^https?:\/\//i.test(handle)) return handle;
  return `${STORE_URL}/products/${String(handle).replace(/^\/+/, "")}`;
}

function normalizeProduct(raw) {
  return {
    id: raw.product_id || raw.handle || raw.id || Math.random().toString(36).slice(2),
    title: raw.title || "Product",
    price: raw.price ?? "",
    image: raw.image_url || raw.image || "",
    url: productUrl(raw.handle || raw.url || raw.slug || ""),
    stock_status: raw.stock_status || raw.stockStatus || "",
    handle: raw.handle || "",
    model: raw.product_id || raw.model || raw.type || "",
    description_short: raw.description_short || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    vendor: raw.vendor || "",
    category: raw.category || "",
    type: raw.type || "",
  };
}

function isInStock(raw) {
  const s = normalizeText(raw.stock_status || raw.stockStatus || "").replace(/[\s\-]/g, "_");
  return s === "in_stock";
}

function scoreProduct(raw, userMessage) {
  const q = normalizeText(userMessage);
  const words = tokenize(userMessage);
  const haystack = normalizeText([
    raw.title,
    raw.type,
    raw.category,
    raw.vendor,
    raw.description_short,
    Array.isArray(raw.tags) ? raw.tags.join(" ") : "",
    raw.handle,
  ].join(" "));

  let score = 0;

  for (const phrase of PRODUCT_INTENT_KEYWORDS) {
    if (q.includes(phrase) && haystack.includes(phrase)) score += 8;
  }

  for (const w of words) {
    if (haystack.includes(w)) score += 2;
  }

  if (q.includes("yogurt") && haystack.includes("yogurt")) score += 12;
  if (q.includes("rice cooker") && haystack.includes("rice cooker")) score += 12;
  if ((q.includes("cheong fun") || q.includes("rice roll")) && (haystack.includes("cheong fun") || haystack.includes("rice roll"))) score += 12;
  if (q.includes("blender") && haystack.includes("blender")) score += 12;
  if (q.includes("air fryer") && haystack.includes("air fryer")) score += 12;
  if (q.includes("humidifier") && haystack.includes("humidifier")) score += 12;
  if (q.includes("sterilizer") && haystack.includes("sterilizer")) score += 12;
  if (q.includes("dough maker") && haystack.includes("dough maker")) score += 12;
  if (q.includes("parts") && haystack.includes("parts")) score += 6;

  if (q.includes("yogurt") && !haystack.includes("yogurt")) score -= 10;
  if (q.includes("rice cooker") && !haystack.includes("rice cooker")) score -= 10;
  if ((q.includes("cheong fun") || q.includes("rice roll")) && !(haystack.includes("cheong fun") || haystack.includes("rice roll"))) score -= 10;
  if (q.includes("blender") && !haystack.includes("blender")) score -= 10;

  return score;
}

async function searchKB(userMessage) {
  const url = `${FAQ_API_URL}/api/search?q=${encodeURIComponent(userMessage)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`FAQ API HTTP ${response.status}`);
  }

  const data = await response.json();
  const faqs = Array.isArray(data.faqMatches) ? data.faqMatches : Array.isArray(data.faqs) ? data.faqs : [];
  const rawProducts = Array.isArray(data.productMatches) ? data.productMatches : Array.isArray(data.products) ? data.products : [];

  const products = rawProducts
    .filter(isInStock)
    .map(normalizeProduct)
    .map((p) => ({ ...p, _score: scoreProduct(p, userMessage) }))
    .filter((p) => p._score >= 4)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(({ _score, ...rest }) => rest);

  return { faqs, products };
}

function summarizeFaqs(faqs) {
  return (faqs || []).slice(0, 8).map((f, i) => {
    const q = f.question || f.q || "";
    const a = f.answer || f.a || "";
    return `FAQ ${i + 1}\nQuestion: ${q}\nAnswer: ${a}`;
  }).join("\n\n");
}

function wantsDifferentLanguage(text) {
  return /(please speak english|english please|reply in english|respond in english)/i.test(text)
    ? "English"
    : /(español|spanish|habla español|en español|reply in spanish)/i.test(text)
    ? "Spanish"
    : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body || {};
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Missing message" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        response: "The assistant is not fully configured yet. Please contact support@cyberhome.app for assistance.",
        products: [],
        meta: { productsCount: 0 },
      });
    }

    const { isProductIntent } = extractIntent(userMessage);

    let kb = { faqs: [], products: [] };
    try {
      kb = await searchKB(userMessage);
    } catch (err) {
      console.error("KB search failed:", err);
    }

    const languageRequest = wantsDifferentLanguage(userMessage);
    const faqContext = summarizeFaqs(kb.faqs);

    const messages = [
      {
        role: "system",
        content:
          "You are CyberHome Support Assistant for a U.S./Canada Shopify home appliance store. " +
          "Always answer in English unless the user explicitly asks for another language. " +
          "Be concise, warm, and sales-helpful. " +
          "For policy, shipping, warranty, voltage, returns, and store information, rely only on the FAQ context provided. " +
          "Do not invent policies. " +
          "If the user is asking for product discovery or recommendation, answer briefly and then let the UI show up to 3 matching products if available. " +
          "Do not list many products in text if product cards will already be shown.",
      },
    ];

    if (faqContext) {
      messages.push({
        role: "system",
        content: `Relevant FAQ / store knowledge:\n\n${faqContext}`,
      });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of safeHistory) {
      if (!h || !h.role || !h.content) continue;
      messages.push({
        role: h.role === "assistant" ? "assistant" : "user",
        content: String(h.content).slice(0, 1000),
      });
    }

    let productHint = "";
    if (isProductIntent && kb.products.length > 0) {
      productHint = kb.products.map((p, idx) => {
        return `${idx + 1}. ${p.title} | model: ${p.model || "N/A"} | price: ${p.price || "N/A"}`;
      }).join("\n");
    }

    messages.push({
      role: "user",
      content:
        `Customer message: ${userMessage}\n` +
        (languageRequest ? `Preferred language for this reply: ${languageRequest}\n` : "") +
        (productHint ? `Matching in-stock products found:\n${productHint}\n` : "") +
        `Reply rules:
- Keep answer under 120 words.
- If policy/store question: answer directly from FAQ context.
- If product inquiry: answer naturally, then the UI may show product cards.
- If there are no matching products, ask one short clarifying question instead of guessing.`,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 260,
      messages,
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim() ||
      "I’m here to help. Could you tell me a bit more about what you’re looking for?";

    return res.status(200).json({
      response: responseText,
      products: isProductIntent ? kb.products.slice(0, 3) : [],
      meta: {
        productsCount: isProductIntent ? kb.products.slice(0, 3).length : 0,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(200).json({
      response: "Sorry, the service is temporarily unavailable. Please try again in a moment or email support@cyberhome.app.",
      products: [],
      meta: { productsCount: 0 },
    });
  }
}

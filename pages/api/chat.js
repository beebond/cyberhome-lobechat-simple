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

const STOPWORDS = new Set([
  "do", "you", "have", "the", "a", "an", "and", "or", "for", "with", "please", "some",
  "recommend", "show", "me", "i", "am", "looking", "to", "of", "on", "in", "is", "are",
  "sell", "need", "want", "product", "products", "bear", "brand", "machine", "electric",
  "appliance", "appliances", "please", "send", "link"
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

function buildSearchQueries(userMessage) {
  const q = normalizeText(userMessage);
  const queries = [userMessage];

  if (q.includes("rice roll") || q.includes("cheong fun") || q.includes("rice noodle roll")) {
    queries.push(
      "rice roll steamer",
      "cheong fun steamer",
      "rice noodle roll steamer",
      "cheong fun machine",
      "rice noodle roll machine"
    );
  }

  if (q.includes("yogurt")) {
    queries.push("yogurt maker");
  }

  if (q.includes("glass jar") || q.includes("jar")) {
    queries.push("yogurt maker glass jar");
  }

  if (q.includes("blender")) {
    queries.push("blender");
  }

  if (q.includes("rice cooker")) {
    queries.push("rice cooker");
  }

  return [...new Set(queries)];
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
    raw.model,
  ].join(" "));

  let score = 0;

  for (const w of words) {
    if (haystack.includes(w)) score += 2;
  }

  if (q.includes("yogurt") && haystack.includes("yogurt")) score += 12;
  if (q.includes("rice cooker") && haystack.includes("rice cooker")) score += 12;
  if ((q.includes("cheong fun") || q.includes("rice roll") || q.includes("rice noodle roll")) &&
      (haystack.includes("cheong fun") || haystack.includes("rice roll") || haystack.includes("rice noodle roll"))) {
    score += 16;
  }
  if (q.includes("steamer") && haystack.includes("steamer")) score += 8;
  if (q.includes("blender") && haystack.includes("blender")) score += 12;
  if (q.includes("air fryer") && haystack.includes("air fryer")) score += 12;
  if (q.includes("humidifier") && haystack.includes("humidifier")) score += 12;
  if (q.includes("sterilizer") && haystack.includes("sterilizer")) score += 12;
  if (q.includes("dough maker") && haystack.includes("dough maker")) score += 12;
  if ((q.includes("jar") || q.includes("glass jar")) && (haystack.includes("jar") || haystack.includes("glass"))) score += 10;

  // Penalize obvious mismatch for narrow queries
  if (q.includes("yogurt") && !haystack.includes("yogurt")) score -= 10;
  if (q.includes("blender") && !haystack.includes("blender")) score -= 10;
  if (q.includes("rice cooker") && !haystack.includes("rice cooker")) score -= 10;
  if ((q.includes("cheong fun") || q.includes("rice roll")) &&
      !(haystack.includes("cheong fun") || haystack.includes("rice roll") || haystack.includes("rice noodle roll"))) {
    score -= 12;
  }

  return score;
}

function dedupeProducts(products) {
  const seen = new Set();
  const result = [];

  for (const p of products) {
    const key = p.handle || p.id || p.title;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result;
}

async function fetchSearch(query) {
  const url = `${FAQ_API_URL}/api/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`FAQ API HTTP ${response.status}`);
  }

  return response.json();
}

async function searchKB(userMessage) {
  const queries = buildSearchQueries(userMessage);

  let allFaqs = [];
  let allProducts = [];

  for (const q of queries) {
    try {
      const data = await fetchSearch(q);
      const faqs = Array.isArray(data.faqMatches) ? data.faqMatches : Array.isArray(data.faqs) ? data.faqs : [];
      const rawProducts = Array.isArray(data.productMatches) ? data.productMatches : Array.isArray(data.products) ? data.products : [];

      allFaqs = allFaqs.concat(faqs);
      allProducts = allProducts.concat(rawProducts);
    } catch (err) {
      console.error("KB query failed:", q, err);
    }
  }

  const normalized = allProducts
    .filter(isInStock)
    .map(normalizeProduct)
    .map((p) => ({ ...p, _score: scoreProduct(p, userMessage) }));

  let ranked = dedupeProducts(normalized)
    .filter((p) => p._score >= 2)
    .sort((a, b) => b._score - a._score);

  // Fallback if scoring too strict
  if (ranked.length === 0) {
    ranked = dedupeProducts(normalized).sort((a, b) => b._score - a._score);
  }

  return {
    faqs: allFaqs.slice(0, 8),
    products: ranked.slice(0, 3).map(({ _score, ...rest }) => rest),
  };
}

function summarizeFaqs(faqs) {
  return (faqs || [])
    .slice(0, 8)
    .map((f, i) => {
      const q = f.question || f.q || "";
      const a = f.answer || f.a || "";
      return `FAQ ${i + 1}
Question: ${q}
Answer: ${a}`;
    })
    .join("\n\n");
}

function detectLanguagePreference(text) {
  if (/(please speak english|english please|reply in english|respond in english)/i.test(text)) {
    return "English";
  }
  if (/(español|spanish|habla español|en español|reply in spanish)/i.test(text)) {
    return "Spanish";
  }
  return null;
}

function extractIntent(userMessage) {
  const q = normalizeText(userMessage);

  const isProductIntent =
    /(looking for|do you have|recommend|compare|which one|best|model|show me|rice cooker|yogurt|steamer|cheong fun|blender|air fryer|humidifier|sterilizer|dough maker|jar)/i.test(q);

  const asksPolicy =
    /(shipping|ship|delivery|warranty|return|refund|voltage|canada|mexico|policy|support|contact)/i.test(q);

  return { isProductIntent, asksPolicy };
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

    const { isProductIntent, asksPolicy } = extractIntent(userMessage);

    let kb = { faqs: [], products: [] };
    try {
      kb = await searchKB(userMessage);
    } catch (err) {
      console.error("KB search failed:", err);
    }

    const faqContext = summarizeFaqs(kb.faqs);
    const languagePreference = detectLanguagePreference(userMessage);

    const messages = [
      {
        role: "system",
        content:
          "You are CyberHome Support Assistant for a U.S./Canada Shopify home appliance store. " +
          "Always answer in English unless the user explicitly asks for another language. " +
          "Be concise, natural, warm, and commercially helpful. " +
          "Do not invent store policies. Use only the FAQ/store context when answering policy questions. " +
          "If matching in-stock products exist, do not say you cannot send direct links. The UI can show product cards with links. " +
          "If products exist, keep product text short because the cards will appear below.",
      },
    ];

    if (faqContext) {
      messages.push({
        role: "system",
        content: `Relevant FAQ/store context:\n\n${faqContext}`,
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
    if (kb.products.length > 0) {
      productHint = kb.products.map((p, i) => {
        return `${i + 1}. ${p.title} | model: ${p.model || "N/A"} | price: ${p.price || "N/A"} | url: ${p.url}`;
      }).join("\n");
    }

    messages.push({
      role: "user",
      content:
        `Customer message: ${userMessage}\n` +
        (languagePreference ? `Preferred language for this reply: ${languagePreference}\n` : "") +
        (productHint ? `Matching in-stock products:\n${productHint}\n` : "") +
        `Reply rules:
- Keep reply under 100 words.
- If this is a store policy / shipping / warranty question, answer from FAQ context only.
- If matching products exist, say you found some relevant options and keep the answer brief.
- Do not say "I can't send direct links."
- If no matching products exist for a product inquiry, ask one short clarifying question instead of forcing an unrelated recommendation.
- Stay in English unless the user explicitly asks another language.`,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 220,
      messages,
    });

    const responseText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I’m happy to help. Could you tell me a bit more about what you’re looking for?";

    return res.status(200).json({
      response: responseText,
      products: isProductIntent ? kb.products : [],
      meta: {
        productsCount: isProductIntent ? kb.products.length : 0,
        faqCount: kb.faqs.length,
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
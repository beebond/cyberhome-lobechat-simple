import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STORE_URL =
  (process.env.STORE_URL || "https://www.cyberhome.app").replace(/\/+$/, "");

let FAQ_API_URL =
  (process.env.FAQ_API_URL ||
    "https://cyberhome-faq-api-production.up.railway.app").trim();

if (FAQ_API_URL && !/^https?:\/\//i.test(FAQ_API_URL)) {
  FAQ_API_URL = "https://" + FAQ_API_URL;
}
FAQ_API_URL = FAQ_API_URL.replace(/\/+$/, "");

const rateMap = new Map();

const MODEL_ALIAS_MAP = {
  "SNJ-C10T1": ["SNJ-C10T1BK"],
  "SNJ-C10T1BK": ["SNJ-C10T1", "SNJ-C10T1BK"],
  "SNJ-C10H2": ["SNJ-C10H2"],
  "SJJ-M03P1": ["SJJ-M03P1"],
  "SJJ-R03B5": ["SJJ-R03B5"],
  "JD-NL21": ["JD-NL21"],
  "HMJ-A35M1": ["HMJ-A35M1"],
};

const FAMILY_PINNED_MODELS = {
  yogurt_maker: ["SNJ-C10H2", "SNJ-C10T1BK"],
  baby_food_maker: ["SJJ-M03P1", "SJJ-R03B5"],
  dough_maker: ["JD-NL21", "HMJ-A35M1"],
};

const FAMILY_MORE_LINKS = {
  yogurt_maker: {
    url: "https://www.cyberhome.app/collections/yogurt-makers",
    label: "More Yogurt Makers",
  },
  baby_food_maker: {
    url: "https://www.cyberhome.app/collections/baby-food-makers",
    label: "More Baby Food Makers",
  },
  dough_maker: {
    url: "https://www.cyberhome.app/collections/dough-makers",
    label: "More Dough Makers",
  },
  juicer: {
    url: "https://www.cyberhome.app/collections/juicers",
    label: "More Juicers",
  },
  air_purifier: {
    url: "https://www.cyberhome.app/collections/air-purifiers",
    label: "More Air Purifiers",
  },
  nut_milk_maker: {
    url: "https://www.cyberhome.app/collections/nut-milk-makers",
    label: "More Nut Milk Makers",
  },
  kettle: {
    url: "https://www.cyberhome.app/collections/kettles",
    label: "More Kettles",
  },
};

const SYNONYM_TO_FAMILY = [
  { pattern: /\b(food processor|puree maker|purée maker|steam blender|steamer blender)\b/i, family: "baby_food_maker" },
  { pattern: /\b(soy milk machine|soymilk maker|bean milk maker|oat milk maker|nut milk maker)\b/i, family: "nut_milk_maker" },
  { pattern: /\b(egg cooker|egg boiler)\b/i, family: "egg_cooker" },
  { pattern: /\b(water dispenser|hot water dispenser)\b/i, family: "kettle" },
  { pattern: /\b(multi cooker|mini cooker|electric cooker)\b/i, family: "rice_cooker" },
  { pattern: /\b(tea maker|tea kettle)\b/i, family: "kettle" },
  { pattern: /\b(hot pot|electric hot pot)\b/i, family: "hot_pot" },
];

const STOPWORDS = new Set([
  "do","you","have","the","a","an","and","or","for","with","please","some","recommend","show","me",
  "i","am","looking","to","of","on","in","is","are","sell","need","want","product","products","bear",
  "brand","machine","electric","appliance","appliances","send","link","links","can","could","would",
  "tell","yes","no","ok","okay","hi","hello","there","well","let","lets","speak","any","this","that",
  "one","about","more"
]);

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxPerMinute = 8;
  const existing = rateMap.get(ip) || [];
  const recent = existing.filter((t) => now - t < windowMs);

  if (recent.length >= maxPerMinute) {
    rateMap.set(ip, recent);
    return false;
  }

  recent.push(now);
  rateMap.set(ip, recent);
  return true;
}

function isTooLong(text) {
  return String(text || "").length > 500;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function tokenize(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9\u4e00-\u9fff\s\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w));
}

function extractRecentContext(history = []) {
  const recent = Array.isArray(history) ? history.slice(-6) : [];
  return recent.map((h) => h?.content || "").join(" ").toLowerCase();
}

function detectLanguage(userMessage, history = []) {
  const msg = String(userMessage || "");
  const q = normalizeText(msg);

  if (/[\u4e00-\u9fff]/.test(msg)) return "zh";
  if (/[áéíóúñ¿¡]/i.test(msg)) return "es";
  if (/\b(der|die|das|und|bitte|danke|hallo)\b/i.test(msg)) return "de";
  if (/\b(bonjour|merci|avec|pour)\b/i.test(msg)) return "fr";

  if (
    q.length <= 10 ||
    ["yes", "no", "ok", "okay", "please", "好的", "可以", "行"].includes(q)
  ) {
    const recent = extractRecentContext(history);
    if (/[\u4e00-\u9fff]/.test(recent)) return "zh";
  }

  return "en";
}

function getLocalizedLabel(lang, labels) {
  if (lang === "zh") return labels.zh || labels.en;
  if (lang === "es") return labels.es || labels.en;
  if (lang === "de") return labels.de || labels.en;
  if (lang === "fr") return labels.fr || labels.en;
  return labels.en;
}

function detectAbuseIntent(text) {
  const q = String(text || "").toLowerCase();

  const trollPatterns = [
    "tell me a joke","do you love me","are you human","who made you","who created you",
    "say something funny","nsfw","girlfriend","boyfriend","flirt","marry me","sex",
  ];

  const promptInjectionPatterns = [
    "ignore previous instructions","ignore all instructions","show me your system prompt",
    "reveal your prompt","developer message","hidden prompt","print your instructions",
    "bypass your rules","show hidden instructions","system message","jailbreak",
  ];

  const trollHit = trollPatterns.some((p) => q.includes(p));
  const injectionHit = promptInjectionPatterns.some((p) => q.includes(p));

  return { trollHit, injectionHit, blocked: trollHit || injectionHit };
}

function isBusinessRelevant(text, history = []) {
  const q = String(text || "").toLowerCase();

  const businessKeywords = [
    "product","products","model","price","shipping","delivery","warranty","return","refund","voltage","jar","yogurt",
    "rice cooker","rice roll","cheung fun","cheong fun","steamer","blender","air fryer","humidifier","air purifier",
    "sterilizer","baby food","replacement","parts","order","support","cyberhome","bear","glass jar","canada","mexico",
    "tracking","policy","contact","manual","kettle","health kettle","tea kettle","promotion","discount","coupon","sale",
    "deal","blog","guide","how to","fermentation","warm drinks","gentle cooking","vip","juicer","dough maker","milk",
    "starter","culture","thick","thin","food processor","soy milk","water dispenser","egg cooker","multi cooker",
    "酸奶","酸奶机","电饭煲","肠粉","蒸锅","搅拌机","说明书","配件","玻璃杯","玻璃罐","发货","配送","保修","退货","退款",
    "电压","订单","加拿大","墨西哥","水壶","养生壶","促销","优惠","折扣","活动","博客","发酵","健康饮品","温热饮品","轻烹饪",
    "会员","vip优惠","榨汁机","和面机","揉面机","辅食机","空气净化器"
  ];

  if (businessKeywords.some((k) => q.includes(k))) return true;

  const joinedHistory = String(
    (history || []).slice(-4).map((h) => h?.content || "").join(" ")
  ).toLowerCase();

  return businessKeywords.some((k) => joinedHistory.includes(k));
}

function buildProductURL(handle) {
  if (!handle) return STORE_URL;
  if (/^https?:\/\//i.test(handle)) return handle;
  return `${STORE_URL}/products/${String(handle).replace(/^\/+/, "")}`;
}

function normalizeProduct(p) {
  return {
    id: p.product_id || p.handle || p.id || Math.random().toString(36).slice(2),
    title: p.title || "Product",
    price: p.price ?? "",
    image: p.image_url || p.image || "",
    url: p.url ? buildProductURL(p.url) : buildProductURL(p.handle || p.slug || ""),
    handle: p.handle || "",
    model: p.model || p.product_id || p.product_type || p.product_family || p.type || "",
    stock_status: p.stock_status || p.stockStatus || "",
    score: Number(p.score || 0),
    short_description: p.short_description || p.description_short || "",
    tags: Array.isArray(p.tags) ? p.tags : [],
    category: p.category || "",
    product_type: p.product_type || p.type || "",
    product_family: p.product_family || "",
    category_tree: p.category_tree || "",
    ai_tags: Array.isArray(p.ai_tags) ? p.ai_tags : [],
    use_case: Array.isArray(p.use_case) ? p.use_case : [],
    compatible_models: Array.isArray(p.compatible_models) ? p.compatible_models : [],
    aliases: Array.isArray(p.aliases) ? p.aliases : [],
    search_keywords: Array.isArray(p.search_keywords) ? p.search_keywords : [],
  };
}

function hasReliableStockField(products) {
  if (!Array.isArray(products) || products.length === 0) return false;
  return products.some((p) => {
    const s = normalizeText(p.stock_status || p.stockStatus || "").replace(/[\s\-]/g, "_");
    return ["in_stock","out_of_stock","preorder","draft","archived","inactive"].includes(s);
  });
}

function filterInStockIfPossible(products) {
  if (!Array.isArray(products)) return [];
  if (!hasReliableStockField(products)) return products;

  const filtered = products.filter((p) => {
    const s = normalizeText(p.stock_status || p.stockStatus || "").replace(/[\s\-]/g, "_");
    return s === "in_stock" || s === "preorder";
  });

  return filtered.length > 0 ? filtered : products;
}

function dedupeProducts(products) {
  const seen = new Set();
  const result = [];

  for (const p of products) {
    const key = [normalizeText(p.handle), normalizeText(p.model), normalizeText(p.title)].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result;
}

function dedupeSimpleItems(items = [], keyCandidates = ["id", "title", "url"]) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyCandidates.map((k) => item?.[k] || "").join("|");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function buildProductSignature(products = []) {
  if (!Array.isArray(products) || products.length === 0) return "";
  return products
    .map((p) => p.handle || p.id || p.title || "")
    .filter(Boolean)
    .join("|");
}

function getLastAssistantProductSignature(history = []) {
  if (!Array.isArray(history)) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item?.role === "assistant" && item?.meta?.productSignature) {
      return item.meta.productSignature;
    }
  }
  return "";
}

function shouldInheritProductContext(userMessage) {
  const q = normalizeText(userMessage);

  if (
    /(promotion|discount|coupon|sale|deal|shipping|ship|delivery|warranty|return|refund|policy|contact|email|support|mexico|canada|voltage|manual|说明书|发货|配送|保修|退货|退款|政策|促销|优惠|折扣|活动|加拿大|墨西哥|blog|guide|fermentation|warm drinks|gentle cooking|vip)/i.test(q)
  ) {
    return false;
  }

  return (
    q.length <= 50 &&
    /(what about|how about|this one|that one|jar|glass jar|lid|parts|accessory|manual|more|another|还有吗|这个呢|那这个|配件|玻璃杯|玻璃罐|型号|model)/i.test(q)
  );
}

function buildContextualQuery(userMessage, history = []) {
  const current = normalizeText(userMessage);
  const recent = shouldInheritProductContext(userMessage) ? extractRecentContext(history) : "";
  return `${current} ${recent}`.trim();
}

function detectModelQuery(text) {
  const raw = String(text || "").toUpperCase();
  const matches = raw.match(/\b[A-Z]{2,5}-[A-Z0-9]{2,8}\b/g)?.filter(Boolean) || [];
  const cleaned = [...new Set(matches.map((m) => m.trim()))];
  const primaryModel = cleaned[0] || "";

  return {
    isModelQuery: cleaned.length > 0,
    models: cleaned,
    primaryModel,
  };
}

function detectSynonymFamily(text) {
  const q = String(text || "");
  for (const item of SYNONYM_TO_FAMILY) {
    if (item.pattern.test(q)) return item.family;
  }
  return null;
}

function detectProductFamily(text, history = []) {
  const q = buildContextualQuery(text, history);
  const synonymFamily = detectSynonymFamily(q);
  if (synonymFamily) return synonymFamily;

  if (
    q.includes("health kettle") ||
    q.includes("养生壶") ||
    q.includes("kettle") ||
    q.includes("water kettle") ||
    q.includes("tea kettle")
  ) return "kettle";

  if (
    q.includes("glass jar") ||
    q.includes("jar") ||
    q.includes("玻璃罐") ||
    q.includes("玻璃杯")
  ) {
    if (q.includes("yogurt") || q.includes("酸奶")) return "yogurt_accessory";
    return "accessory";
  }

  if (q.includes("yogurt") || q.includes("酸奶")) return "yogurt_maker";

  if (
    q.includes("rice cooker") ||
    q.includes("rice maker") ||
    q.includes("电饭煲") ||
    q.includes("煮饭")
  ) return "rice_cooker";

  if (
    q.includes("rice roll") ||
    q.includes("cheung fun") ||
    q.includes("cheong fun") ||
    q.includes("rice noodle roll") ||
    q.includes("肠粉") ||
    q.includes("米皮")
  ) return "rice_roll_steamer";

  if (
    q.includes("baby food") ||
    q.includes("辅食") ||
    q.includes("baby food maker") ||
    q.includes("辅食机")
  ) return "baby_food_maker";

  if (
    q.includes("dough maker") ||
    q.includes("dough kneader") ||
    q.includes("揉面") ||
    q.includes("和面")
  ) return "dough_maker";

  if (q.includes("blender") || q.includes("搅拌机")) return "blender";
  if (q.includes("air fryer")) return "air_fryer";
  if (q.includes("humidifier")) return "humidifier";
  if (q.includes("air purifier") || q.includes("空气净化器")) return "air_purifier";
  if (q.includes("sterilizer")) return "sterilizer";
  if (q.includes("bottle warmer") || q.includes("milk warmer") || q.includes("暖奶")) return "bottle_warmer";
  if (q.includes("nut milk") || q.includes("soy milk") || q.includes("oat milk")) return "nut_milk_maker";
  if (q.includes("juicer") || q.includes("榨汁机")) return "juicer";
  if (q.includes("manual") || q.includes("说明书")) return "manual_request";

  return null;
}

function familyMatch(product, family) {
  if (!family) return true;

  const haystack = normalizeText(
    [
      product.title,
      product.handle,
      product.model,
      product.product_type,
      product.product_family,
      product.category,
      product.category_tree,
      product.short_description,
      Array.isArray(product.tags) ? product.tags.join(" ") : "",
      Array.isArray(product.ai_tags) ? product.ai_tags.join(" ") : "",
      Array.isArray(product.use_case) ? product.use_case.join(" ") : "",
      Array.isArray(product.aliases) ? product.aliases.join(" ") : "",
      Array.isArray(product.compatible_models) ? product.compatible_models.join(" ") : "",
      Array.isArray(product.search_keywords) ? product.search_keywords.join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (family === "yogurt_maker") {
    return haystack.includes("yogurt") && !haystack.includes("replacement") && !haystack.includes("glass jar");
  }

  if (family === "yogurt_accessory") {
    return haystack.includes("jar") || haystack.includes("glass") || haystack.includes("lid") || haystack.includes("replacement");
  }

  if (family === "baby_food_maker") return haystack.includes("baby food") || haystack.includes("food processor");
  if (family === "dough_maker") return haystack.includes("dough maker") || haystack.includes("dough kneader") || haystack.includes("和面") || haystack.includes("揉面");
  if (family === "air_purifier") return haystack.includes("air purifier");
  if (family === "juicer") return haystack.includes("juicer");
  if (family === "nut_milk_maker") return haystack.includes("nut milk") || haystack.includes("soy milk") || haystack.includes("bean milk") || haystack.includes("oat milk");
  if (family === "kettle") return haystack.includes("kettle") || haystack.includes("water dispenser") || haystack.includes("tea maker");
  if (family === "rice_cooker") return haystack.includes("rice cooker") || haystack.includes("multi cooker");
  if (family === "manual_request") return false;

  return true;
}

function isKnowledgeQuestion(text, history = []) {
  const q = buildContextualQuery(text, history);

  return /(^|\b)(why|how|what milk|best milk|best for yogurt|not thick|too thin|thick|thin|fermentation|starter|culture|recipe|tips|guide|benefits|what is)(\b|$)/i.test(
    q
  );
}

function detectIntent(userMessage, history = []) {
  const current = normalizeText(userMessage);
  const recent = shouldInheritProductContext(userMessage) ? extractRecentContext(history) : "";
  const q = `${current} ${recent}`.trim();
  const modelInfo = detectModelQuery(q);
  const knowledgeQuestion = isKnowledgeQuestion(userMessage, history);
  const family = detectProductFamily(userMessage, history);

  const productIntent =
    !knowledgeQuestion &&
    (/(looking for|do you have|recommend|compare|which one|which machine|best machine|best model|model|show me|yogurt maker|rice cooker|steamer|blender|air fryer|humidifier|sterilizer|jar|parts|manual|kettle|tea kettle|bottle warmer|juicer|nut milk|air purifier|baby food|dough maker|food processor|soy milk|water dispenser|egg cooker|multi cooker|酸奶机|电饭煲|说明书|配件|有吗|推荐|辅食机|榨汁机|空气净化器|和面机|揉面机)/i.test(
      q
    ) || modelInfo.isModelQuery || Boolean(family));

  const policyIntent =
    /(shipping|ship|delivery|warranty|return|refund|voltage|canada|mexico|policy|support|contact|about us|promotion|discount|coupon|sale|deal|terms|vip|发货|配送|加拿大|墨西哥|保修|退货|退款|电压|优惠|折扣|促销|活动|条款|会员|联系我们)/i.test(current);

  const blogIntent =
    knowledgeQuestion ||
    /(how to|guide|blog|healthy|wellness|fermentation|warm drinks|gentle cooking|benefits|homemade yogurt|make yogurt|nutrition|gut health|probiotic|如何|教程|指南|博客|发酵|温热饮品|轻烹饪|健康|酸奶怎么做)/i.test(current);

  const faqIntent =
    knowledgeQuestion ||
    /(problem|issue|not working|broken|damaged|why|how|thick|thin|starter|culture|milk)/i.test(current);

  return { productIntent, policyIntent, blogIntent, faqIntent, knowledgeQuestion, modelInfo, family };
}

function buildSearchQueries(userMessage, history = []) {
  const q = normalizeText(userMessage);
  const context = shouldInheritProductContext(userMessage) ? extractRecentContext(history) : "";
  const combined = `${q} ${context}`.trim();
  const family = detectProductFamily(userMessage, history);

  const queries = [];
  const modelInfo = detectModelQuery(combined);

  if (modelInfo.isModelQuery && modelInfo.primaryModel) {
    queries.push(modelInfo.primaryModel);
    const aliases = MODEL_ALIAS_MAP[modelInfo.primaryModel] || [];
    for (const alias of aliases) queries.push(alias);
  }

  queries.push(userMessage);

  if (family === "yogurt_maker") queries.push("yogurt maker");
  if (family === "baby_food_maker") queries.push("baby food maker");
  if (family === "dough_maker") queries.push("dough maker");
  if (family === "juicer") queries.push("juicer");
  if (family === "air_purifier") queries.push("air purifier");
  if (family === "nut_milk_maker") queries.push("nut milk maker");
  if (family === "kettle") queries.push("kettle");
  if (family === "rice_cooker") queries.push("rice cooker");

  if (combined.includes("refund")) queries.push("refund policy");
  if (combined.includes("contact")) queries.push("contact information");
  if (combined.includes("fermentation")) queries.push("fermentation");
  if (combined.includes("milk") && combined.includes("yogurt")) queries.push("what milk is best for yogurt");
  if (combined.includes("thick") || combined.includes("thin") || combined.includes("starter") || combined.includes("culture")) {
    queries.push("why is yogurt not thick");
  }

  return [...new Set(queries.filter(Boolean))].slice(0, 6);
}

async function fetchWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSearch(query) {
  const url = `${FAQ_API_URL}/api/search?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, 4500);

  if (!response.ok) {
    throw new Error(`FAQ API HTTP ${response.status}`);
  }

  return response.json();
}

function productHaystack(product) {
  return normalizeText(
    [
      product.title,
      product.model,
      product.product_type,
      product.product_family,
      product.category,
      product.category_tree,
      product.short_description,
      Array.isArray(product.tags) ? product.tags.join(" ") : "",
      Array.isArray(product.ai_tags) ? product.ai_tags.join(" ") : "",
      Array.isArray(product.use_case) ? product.use_case.join(" ") : "",
      Array.isArray(product.compatible_models) ? product.compatible_models.join(" ") : "",
      Array.isArray(product.aliases) ? product.aliases.join(" ") : "",
      Array.isArray(product.search_keywords) ? product.search_keywords.join(" ") : "",
      product.handle,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isReplacementOrAccessory(product) {
  const haystack = productHaystack(product);
  return (
    haystack.includes("replacement") ||
    haystack.includes("replacement parts") ||
    haystack.includes("accessory") ||
    haystack.includes("jar only") ||
    haystack.includes("glass jar") ||
    haystack.includes("lid")
  );
}

function wantsAccessoryQuery(text, history = []) {
  const q = buildContextualQuery(text, history);
  return /(replacement|parts|lid|jar|glass jar|accessory|broken|damaged|lost|missing|配件|玻璃罐|玻璃杯)/i.test(q);
}

function scoreProduct(product, userMessage, history = [], options = {}) {
  const q = buildContextualQuery(userMessage, history);
  const words = tokenize(userMessage);
  const haystack = productHaystack(product);
  const family = detectProductFamily(userMessage, history);
  const modelInfo = detectModelQuery(q);
  const wantsAccessory = wantsAccessoryQuery(userMessage, history);

  let score = Number(product.score || 0);

  for (const w of words) {
    if (haystack.includes(w)) score += 3;
  }

  if (family && familyMatch(product, family)) score += 45;
  if (family && !familyMatch(product, family)) score -= 35;

  if ((q.includes("food processor") || q.includes("puree") || q.includes("steam blender")) && (haystack.includes("food processor") || haystack.includes("baby food"))) {
    score += 38;
  }

  if ((q.includes("soy milk") || q.includes("bean milk") || q.includes("oat milk")) && (haystack.includes("soy milk") || haystack.includes("nut milk") || haystack.includes("bean milk") || haystack.includes("oat milk"))) {
    score += 38;
  }

  if ((q.includes("water dispenser") || q.includes("hot water")) && (haystack.includes("water dispenser") || haystack.includes("kettle"))) {
    score += 30;
  }

  if ((q.includes("egg cooker") || q.includes("egg boiler")) && (haystack.includes("egg cooker") || haystack.includes("egg boiler"))) {
    score += 30;
  }

  if ((q.includes("yogurt") || q.includes("酸奶")) && haystack.includes("yogurt")) score += 28;
  if ((q.includes("baby food") || q.includes("辅食")) && haystack.includes("baby food")) score += 28;
  if ((q.includes("dough maker") || q.includes("和面") || q.includes("揉面")) && (haystack.includes("dough maker") || haystack.includes("dough kneader"))) score += 28;
  if (q.includes("juicer") && haystack.includes("juicer")) score += 24;
  if ((q.includes("air purifier") || q.includes("空气净化器")) && haystack.includes("air purifier")) score += 24;
  if ((q.includes("kettle") || q.includes("tea maker")) && haystack.includes("kettle")) score += 24;

  if (modelInfo.isModelQuery) {
    const allModels = new Set();
    for (const m of modelInfo.models) allModels.add(m);
    for (const m of modelInfo.models) {
      const aliasList = MODEL_ALIAS_MAP[m] || [];
      for (const alias of aliasList) allModels.add(alias);
    }

    const productModel = String(product.model || "").toUpperCase();
    const productAliases = Array.isArray(product.aliases) ? product.aliases.map((x) => String(x).toUpperCase()) : [];
    const productCompatible = Array.isArray(product.compatible_models) ? product.compatible_models.map((x) => String(x).toUpperCase()) : [];

    if (allModels.has(productModel)) score += 220;
    if (productAliases.some((a) => allModels.has(a))) score += 180;
    if (productCompatible.some((a) => allModels.has(a))) score += 100;

    if (
      !allModels.has(productModel) &&
      !productAliases.some((a) => allModels.has(a)) &&
      !productCompatible.some((a) => allModels.has(a))
    ) {
      score -= 80;
    }
  }

  if (isReplacementOrAccessory(product) && !wantsAccessory) score -= 120;
  if (isReplacementOrAccessory(product) && wantsAccessory) score += 55;
  if (family === "manual_request") score -= 60;
  if (options.forceMainProduct && !isReplacementOrAccessory(product)) score += 30;

  const pinnedModels = FAMILY_PINNED_MODELS[family] || [];
  const productModel = String(product.model || "").toUpperCase();
  if (pinnedModels.includes(productModel)) score += 40;

  return score;
}

function standardFallbackText(lang = "en") {
  switch (lang) {
    case "zh":
      return "作为 AI 助手，我暂时无法准确回答这个问题。请发送邮件至 support@cyberhome.app，或填写下方反馈表单，我们的同事会尽快跟进。";
    default:
      return "As an AI assistant, I can't answer this question accurately right now. Please email support@cyberhome.app or fill in the feedback form below, and our colleague will get back to you soon.";
  }
}

function buildFallbackResponse(lang, reason, extra = {}) {
  return {
    response: standardFallbackText(lang),
    products: [],
    meta: {
      productsCount: 0,
      faqCount: 0,
      policyCount: 0,
      blogCount: 0,
      showContactForm: true,
      handoffToHuman: true,
      fallbackTriggered: true,
      reason,
      ...extra,
    },
  };
}

function buildPolicyDirectResponse(policy) {
  return (policy?.answer || policy?.content || "").trim();
}

function buildBlogDirectResponse(blog, lang) {
  const title = blog?.title || "";
  const summary = blog?.summary || "";
  const intro = getLocalizedLabel(lang, {
    en: `Here's a quick summary from our guide "${title}":`,
    zh: `以下是我们相关指南《${title}》的简要说明：`,
  });
  return `${intro} ${summary}`.trim();
}

function getPolicyLinkLabel(policy, lang) {
  const title = normalizeText(policy?.title || "");
  if (title.includes("refund")) return getLocalizedLabel(lang, { en: "View Refund Policy", zh: "查看退款政策" });
  if (title.includes("contact")) return getLocalizedLabel(lang, { en: "View Contact Information", zh: "查看联系信息" });
  if (title.includes("terms")) return getLocalizedLabel(lang, { en: "View Terms of Service", zh: "查看服务条款" });
  if (title.includes("vip")) return getLocalizedLabel(lang, { en: "View VIP Discount Page", zh: "查看 VIP 优惠页面" });
  return getLocalizedLabel(lang, { en: "View Policy", zh: "查看政策页面" });
}

function getBlogLinkLabel(blog, lang) {
  const category = normalizeText(blog?.category || "");
  const title = normalizeText(blog?.title || "");

  if (category.includes("fermentation") || title.includes("fermentation")) {
    return getLocalizedLabel(lang, { en: "Read Fermentation Guide", zh: "查看发酵指南" });
  }
  if (category.includes("warm_drinks") || title.includes("warm drinks")) {
    return getLocalizedLabel(lang, { en: "Read Warm Drinks Guide", zh: "查看温热饮品指南" });
  }
  if (category.includes("gentle_cooking") || title.includes("gentle cooking")) {
    return getLocalizedLabel(lang, { en: "Read Gentle Cooking Guide", zh: "查看轻烹饪指南" });
  }
  if (title.includes("yogurt") || title.includes("milk")) {
    return getLocalizedLabel(lang, { en: "Read Yogurt Guide", zh: "查看酸奶指南" });
  }

  return getLocalizedLabel(lang, { en: "Read Full Guide", zh: "查看完整指南" });
}

function shouldDirectPolicyAnswer(userMessage, kb) {
  const q = normalizeText(userMessage);
  const top = kb?.policies?.[0];
  if (!top) return false;
  return /refund|return|contact|shipping|delivery|warranty|vip|discount|terms|about us|policy|support|发货|退货|退款|保修|联系我们|政策|优惠|折扣|会员/.test(q);
}

function shouldDirectBlogAnswer(userMessage, history, kb, productIntent, policyIntent) {
  const q = buildContextualQuery(userMessage, history);
  if (productIntent || policyIntent) return false;
  const top = kb?.blogs?.[0];
  if (!top) return false;

  return (
    isKnowledgeQuestion(userMessage, history) ||
    /how to make yogurt|homemade yogurt|fermentation|warm drinks|gentle cooking|what is fermentation|healthy warm drinks|why is my yogurt not thick|what milk is best for yogurt|如何做酸奶|发酵|温热饮品|轻烹饪/.test(q)
  );
}

function summarizeFaqs(faqs) {
  return (faqs || [])
    .slice(0, 2)
    .map((f) => `Q: ${f.question || f.title}\nA: ${f.answer || ""}`)
    .join("\n\n");
}

function summarizePolicies(policies) {
  return (policies || [])
    .slice(0, 2)
    .map((p) => `Policy: ${p.title || ""}\n${p.answer || p.content || ""}`)
    .join("\n\n");
}

function summarizeBlogs(blogs) {
  return (blogs || [])
    .slice(0, 1)
    .map((b) => `Blog: ${b.title || ""}\n${b.summary || ""}`)
    .join("\n\n");
}

function pinFamilyModels(products, family) {
  if (!Array.isArray(products) || products.length === 0 || !family) return products;

  const pinned = FAMILY_PINNED_MODELS[family] || [];
  if (pinned.length === 0) return products;

  const map = new Map();
  for (const p of products) {
    const key = String(p.model || "").toUpperCase();
    if (!map.has(key)) map.set(key, p);
  }

  const result = [];
  const used = new Set();

  for (const model of pinned) {
    const found = map.get(model);
    if (found) {
      result.push(found);
      used.add(found.handle || found.id || found.title);
    }
  }

  for (const p of products) {
    const key = p.handle || p.id || p.title;
    if (!used.has(key)) {
      result.push(p);
      used.add(key);
    }
  }

  return result;
}

function rankProducts(products, userMessage, history = [], options = {}) {
  let normalizedProducts = products.map(normalizeProduct);
  normalizedProducts = filterInStockIfPossible(normalizedProducts);
  normalizedProducts = dedupeProducts(normalizedProducts);

  const family = detectProductFamily(userMessage, history);
  if (family !== "manual_request") {
    const familyFiltered = normalizedProducts.filter((p) => familyMatch(p, family));
    if (familyFiltered.length > 0) normalizedProducts = familyFiltered;
  }

  normalizedProducts = normalizedProducts
    .map((p) => ({ ...p, _score: scoreProduct(p, userMessage, history, options) }))
    .sort((a, b) => b._score - a._score);

  let rankedProducts = normalizedProducts.filter((p) => p._score >= 2);
  if (rankedProducts.length === 0) rankedProducts = normalizedProducts;

  rankedProducts = rankedProducts.map(({ _score, ...rest }) => rest);
  rankedProducts = pinFamilyModels(rankedProducts, family);

  return rankedProducts;
}

async function searchKnowledge(userMessage, history = []) {
  const queries = buildSearchQueries(userMessage, history);
  const modelInfo = detectModelQuery(buildContextualQuery(userMessage, history));

  const results = [];
  for (const q of queries) {
    try {
      results.push(await fetchSearch(q));
    } catch {}
  }

  let allFaqs = [];
  let allProducts = [];
  let allPolicies = [];
  let allBlogs = [];

  for (const data of results) {
    const faqMatches = Array.isArray(data?.faqMatches) ? data.faqMatches : [];
    const productMatches = Array.isArray(data?.productMatches)
      ? data.productMatches
      : Array.isArray(data?.products)
      ? data.products
      : [];
    const policyMatches = Array.isArray(data?.policyMatches) ? data.policyMatches : [];
    const blogMatches = Array.isArray(data?.blogMatches) ? data.blogMatches : [];

    allFaqs = allFaqs.concat(faqMatches);
    allProducts = allProducts.concat(productMatches);
    allPolicies = allPolicies.concat(policyMatches);
    allBlogs = allBlogs.concat(blogMatches);
  }

  allFaqs = dedupeSimpleItems(allFaqs, ["id", "title", "question", "url"]).slice(0, 6);
  allPolicies = dedupeSimpleItems(allPolicies, ["id", "title", "url"]).slice(0, 4);
  allBlogs = dedupeSimpleItems(allBlogs, ["id", "title", "url"]).slice(0, 3);

  const rankedProducts = rankProducts(allProducts, userMessage, history, {
    forceMainProduct: true,
  });

  let finalProducts = rankedProducts;

  if (modelInfo.isModelQuery) {
    finalProducts = rankProducts(allProducts, userMessage, history, {
      forceMainProduct: true,
    }).slice(0, 3);
  }

  if (detectProductFamily(userMessage, history) === "manual_request") {
    finalProducts = [];
  }

  return {
    faqs: allFaqs,
    products: finalProducts,
    policies: allPolicies,
    blogs: allBlogs,
    modelInfo,
  };
}

function getProductDisplayLimit({ modelInfo, blogIntent, productIntent }) {
  if (modelInfo?.isModelQuery) return 1;
  if (blogIntent) return 0;
  if (productIntent) return 2;
  return 0;
}

function shouldShowProducts({ kb, policyIntent, productIntent, blogIntent, modelInfo, family }) {
  if (policyIntent) return false;
  if (blogIntent) return false;
  if (!Array.isArray(kb?.products) || kb.products.length === 0) return false;
  if (modelInfo?.isModelQuery) return true;
  if (productIntent) return true;
  if (family) return true;
  return false;
}

function getMoreLinkMeta(family) {
  return FAMILY_MORE_LINKS[family] || { url: "", label: "" };
}

function buildDirectProductResponse(lang, modelInfo, family) {
  if (modelInfo?.isModelQuery) {
    return getLocalizedLabel(lang, {
      en: `Yes, we have a matching product for ${modelInfo.primaryModel}. Please see the product card below for details.`,
      zh: `是的，我们有与 ${modelInfo.primaryModel} 对应的产品。请查看下方产品卡片了解详情。`,
    });
  }

  if (family === "yogurt_maker") {
    return getLocalizedLabel(lang, {
      en: "Here are some yogurt maker options for you. Please see the product cards below for details.",
      zh: "下面是适合你的酸奶机选项，请查看下方产品卡片了解详情。",
    });
  }

  if (family === "baby_food_maker") {
    return getLocalizedLabel(lang, {
      en: "Here are some baby food maker options for you. Please see the product cards below for details.",
      zh: "下面是适合你的辅食机选项，请查看下方产品卡片了解详情。",
    });
  }

  if (family === "dough_maker") {
    return getLocalizedLabel(lang, {
      en: "Here are some dough maker options for you. Please see the product cards below for details.",
      zh: "下面是适合你的和面机选项，请查看下方产品卡片了解详情。",
    });
  }

  if (family === "juicer") {
    return getLocalizedLabel(lang, {
      en: "Here are some relevant juicer options. Please see the product cards below for details.",
      zh: "下面是相关榨汁机选项，请查看下方产品卡片了解详情。",
    });
  }

  if (family === "air_purifier") {
    return getLocalizedLabel(lang, {
      en: "Here are some relevant air purifier options. Please see the product cards below for details.",
      zh: "下面是相关空气净化器选项，请查看下方产品卡片了解详情。",
    });
  }

  if (family === "nut_milk_maker") {
    return getLocalizedLabel(lang, {
      en: "Here are some nut milk maker options for you. Please see the product cards below for details.",
      zh: "下面是相关植物奶机选项，请查看下方产品卡片了解详情。",
    });
  }

  return getLocalizedLabel(lang, {
    en: "Here are some relevant products for you. Please see the product cards below for details.",
    zh: "下面是相关产品，请查看下方产品卡片了解详情。",
  });
}

async function generateShortAIResponse({
  latestLanguage,
  userMessage,
  history,
  kb,
  modelInfo,
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { text: "", usage: {} };
  }

  const faqContext = summarizeFaqs(kb.faqs);
  const policyContext = summarizePolicies(kb.policies);
  const blogContext = summarizeBlogs(kb.blogs);

  const messages = [
    {
      role: "system",
      content:
        "You are CyberHome Support Assistant for a Shopify-based home appliance store serving the U.S. and Canada. " +
        "Always reply in the language of the user's latest message. " +
        "Only help with CyberHome products, compatibility, manuals, shipping, returns, warranty, voltage, replacement parts, orders, official policies, and blog-based educational topics related to CyberHome products. " +
        "Do not include raw URLs. Keep answers short and useful. If knowledge is insufficient, do not guess."
    },
  ];

  if (faqContext) messages.push({ role: "system", content: `Relevant FAQ context:\n\n${faqContext}` });
  if (policyContext) messages.push({ role: "system", content: `Relevant policy context:\n\n${policyContext}` });
  if (blogContext) messages.push({ role: "system", content: `Relevant blog context:\n\n${blogContext}` });

  const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
  for (const h of safeHistory) {
    if (!h?.role || !h?.content) continue;
    messages.push({
      role: h.role === "assistant" ? "assistant" : "user",
      content: String(h.content).slice(0, 700),
    });
  }

  messages.push({
    role: "user",
    content:
      `Customer message: ${userMessage}\n` +
      `Reply language: ${latestLanguage}\n` +
      `Model query: ${modelInfo?.isModelQuery ? "yes" : "no"}\n` +
      `Reply rules:
- Keep the reply under 80 words.
- No URLs.
- If knowledge is incomplete, do not claim certainty.`,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 150,
    messages,
  });

  return {
    text: completion.choices?.[0]?.message?.content?.trim() || "",
    usage: completion?.usage || {},
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientIP = getClientIP(req);
    const { message, history = [], sessionId = "" } = req.body || {};
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Missing message" });
    }

    const latestLanguage = detectLanguage(userMessage, history);

    if (!checkRateLimit(clientIP)) {
      return res.status(200).json({
        response:
          latestLanguage === "zh"
            ? "你发送消息太快了，请稍后再试。"
            : "You're sending messages too quickly. Please wait a moment and try again.",
        products: [],
        meta: { blocked: true, reason: "rate_limit", productsCount: 0, sessionId },
      });
    }

    if (isTooLong(userMessage)) {
      return res.status(200).json({
        response:
          latestLanguage === "zh"
            ? "请将消息控制在 500 个字符以内，这样我可以更准确地帮助你。"
            : "Please keep your message under 500 characters so I can help more accurately.",
        products: [],
        meta: { blocked: true, reason: "message_too_long", productsCount: 0, sessionId },
      });
    }

    const abuse = detectAbuseIntent(userMessage);
    if (abuse.blocked) {
      return res.status(200).json({
        response:
          latestLanguage === "zh"
            ? "我可以协助解答 CyberHome 产品、发货、保修和店铺相关问题。请告诉我你的产品或售前售后问题。"
            : "I'm here to help with CyberHome products, shipping, warranty, and store-related questions. Please ask a product or store support question.",
        products: [],
        meta: {
          blocked: true,
          reason: abuse.injectionHit ? "prompt_injection" : "non_business_abuse",
          productsCount: 0,
          sessionId,
        },
      });
    }

    if (!isBusinessRelevant(userMessage, history)) {
      return res.status(200).json(
        buildFallbackResponse(latestLanguage, "non_business_query", { sessionId })
      );
    }

    const {
      productIntent,
      policyIntent,
      blogIntent,
      faqIntent,
      knowledgeQuestion,
      modelInfo: detectedModelInfo,
      family,
    } = detectIntent(userMessage, history);

    let kb = { faqs: [], products: [], policies: [], blogs: [], modelInfo: {} };
    try {
      kb = await searchKnowledge(userMessage, history);
    } catch (err) {
      console.error("Knowledge search failed:", err);
    }

    const modelInfo = kb.modelInfo || detectedModelInfo || detectModelQuery(userMessage);

    if (
      (!kb.faqs || kb.faqs.length === 0) &&
      (!kb.products || kb.products.length === 0) &&
      (!kb.policies || kb.policies.length === 0) &&
      (!kb.blogs || kb.blogs.length === 0)
    ) {
      return res.status(200).json(
        buildFallbackResponse(latestLanguage, "no_search_result", {
          sessionId,
          productIntent,
          policyIntent,
          blogIntent,
        })
      );
    }

    if (shouldDirectPolicyAnswer(userMessage, kb)) {
      const policy = kb.policies[0];
      return res.status(200).json({
        response: buildPolicyDirectResponse(policy),
        products: [],
        meta: {
          sessionId,
          directAnswer: true,
          source: "policy",
          detailLink: policy?.url || "",
          detailLinkLabel: getPolicyLinkLabel(policy, latestLanguage),
          productsCount: 0,
          faqCount: kb.faqs.length,
          policyCount: kb.policies.length,
          blogCount: kb.blogs.length,
          policyIntent,
          productIntent,
          blogIntent,
          latestLanguage,
          showContactForm: false,
          fallbackTriggered: false,
          handoffToHuman: false,
          productSignature: "",
          moreLink: "",
          moreLinkLabel: "",
        },
      });
    }

    if (shouldDirectBlogAnswer(userMessage, history, kb, productIntent, policyIntent)) {
      const blog = kb.blogs[0];
      return res.status(200).json({
        response: buildBlogDirectResponse(blog, latestLanguage),
        products: [],
        meta: {
          sessionId,
          directAnswer: true,
          source: "blog",
          detailLink: blog?.url || "",
          detailLinkLabel: getBlogLinkLabel(blog, latestLanguage),
          productsCount: 0,
          faqCount: kb.faqs.length,
          policyCount: kb.policies.length,
          blogCount: kb.blogs.length,
          policyIntent,
          productIntent: false,
          blogIntent: true,
          latestLanguage,
          showContactForm: false,
          fallbackTriggered: false,
          handoffToHuman: false,
          productSignature: "",
          moreLink: "",
          moreLinkLabel: "",
        },
      });
    }

    const showProducts = shouldShowProducts({
      kb,
      policyIntent,
      productIntent,
      blogIntent,
      modelInfo,
      family,
    });

    const productLimit = getProductDisplayLimit({
      modelInfo,
      blogIntent,
      productIntent,
    });

    const currentProductSignature = buildProductSignature(kb.products);
    const lastProductSignature = getLastAssistantProductSignature(history);

    let finalProducts = showProducts ? kb.products.slice(0, productLimit) : [];
    if (
      finalProducts.length > 0 &&
      currentProductSignature === lastProductSignature &&
      !modelInfo.isModelQuery
    ) {
      finalProducts = [];
    }

    let responseText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    if (finalProducts.length > 0) {
      responseText = buildDirectProductResponse(latestLanguage, modelInfo, family);
    } else {
      const aiResult = await generateShortAIResponse({
        latestLanguage,
        userMessage,
        history,
        kb,
        modelInfo,
      });

      responseText = aiResult?.text || "";
      const usage = aiResult?.usage || {};
      inputTokens = Number(usage.prompt_tokens || 0);
      outputTokens = Number(usage.completion_tokens || 0);
      totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
    }

    const noUsefulKnowledge =
      (!kb.faqs || kb.faqs.length === 0) &&
      (!kb.products || kb.products.length === 0) &&
      (!kb.policies || kb.policies.length === 0) &&
      (!kb.blogs || kb.blogs.length === 0);

    const lowConfidenceNoMatch =
      finalProducts.length === 0 &&
      (!kb.faqs || kb.faqs.length === 0) &&
      (!kb.blogs || kb.blogs.length === 0) &&
      !policyIntent;

    if (noUsefulKnowledge || lowConfidenceNoMatch) {
      return res.status(200).json(
        buildFallbackResponse(latestLanguage, "unknown_or_unmatched_request", {
          sessionId,
          productIntent,
          policyIntent,
          blogIntent,
          latestLanguage,
          inputTokens,
          outputTokens,
          totalTokens,
        })
      );
    }

    const moreMeta = getMoreLinkMeta(family);

    return res.status(200).json({
      response: responseText,
      products: finalProducts,
      meta: {
        sessionId,
        productsCount: finalProducts.length,
        faqCount: kb.faqs.length,
        policyCount: kb.policies.length,
        blogCount: kb.blogs.length,
        policyIntent,
        productIntent: finalProducts.length > 0 ? true : productIntent,
        blogIntent,
        faqIntent,
        knowledgeQuestion,
        latestLanguage,
        productSignature: finalProducts.length > 0 ? buildProductSignature(finalProducts) : "",
        detailLink: "",
        detailLinkLabel: "",
        source: finalProducts.length > 0 ? "system_product" : "ai",
        showContactForm: false,
        fallbackTriggered: false,
        handoffToHuman: false,
        modelQuery: modelInfo.isModelQuery,
        detectedModel: modelInfo.primaryModel || "",
        detectedFamily: family || "",
        inputTokens,
        outputTokens,
        totalTokens,
        moreLink: finalProducts.length > 0 ? moreMeta.url : "",
        moreLinkLabel: finalProducts.length > 0 ? moreMeta.label : "",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(200).json({
      response:
        "As an AI assistant, I can't answer this question accurately right now. Please email support@cyberhome.app or fill in the feedback form below, and our colleague will get back to you soon.",
      products: [],
      meta: {
        productsCount: 0,
        faqCount: 0,
        policyCount: 0,
        blogCount: 0,
        detailLink: "",
        detailLinkLabel: "",
        showContactForm: true,
        fallbackTriggered: true,
        handoffToHuman: true,
        reason: "server_error",
        moreLink: "",
        moreLinkLabel: "",
      },
    });
  }
}
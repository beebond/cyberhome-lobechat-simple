// pages/api/chat.js - 完整修复版（解决8大问题）
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 产品分类映射表（解决产品匹配错误）
const PRODUCT_CATEGORY_MAP = {
  // 肠粉机/米粉机
  'rice roll steamer': ['CFJ', 'rice roll', '肠粉机', '米粉机', 'cheong fun', 'rice noodle'],
  'rice noodle': ['CFJ', 'rice noodle', '肠粉', '米粉'],
  'cheong fun': ['CFJ', 'cheong fun', '肠粉'],
  
  // 空气炸锅
  'air fryer': ['QZG', '空气炸锅', 'air fryer', '炸锅'],
  
  // 酸奶机
  'yogurt maker': ['SNJ', 'yogurt', '酸奶机'],
  
  // 婴儿辅食/温奶器
  'baby food': ['SJJ', 'NNQ', 'baby', '婴儿', '辅食', '温奶'],
  'bottle warmer': ['NNQ', '温奶器', 'bottle warmer'],
  
  // 搅拌机/榨汁机
  'blender': ['LLJ', '搅拌机', 'blender', '榨汁'],
  'juicer': ['YZJ', 'juicer', '榨汁机'],
  
  // 电水壶
  'kettle': ['ZDH', 'kettle', '电水壶', '热水壶'],
  
  // 米饭锅
  'rice cooker': ['DFB', 'rice cooker', '米饭锅', '电饭煲'],
  
  // 和面机
  'dough maker': ['HMJ', '和面机', 'dough maker'],
  
  // 消毒器
  'sterilizer': ['XDG', '消毒器', 'sterilizer'],
  
  // 加湿器
  'humidifier': ['JSQ', '加湿器', 'humidifier']
};

// 常见产品型号前缀
const PRODUCT_PREFIXES = ['CFJ', 'QZG', 'SNJ', 'SJJ', 'NNQ', 'LLJ', 'ZDH', 'DFB', 'HMJ', 'XDG', 'JSQ', 'YZJ'];

// FAQ关键词（用于判断是否是纯FAQ问题）
const FAQ_KEYWORDS = [
  'return', 'refund', 'warranty', 'shipping', 'delivery', 'contact', 
  '退货', '退款', '保修', '运费', '配送', '联系', '客服'
];

// 格式化产品卡片
function formatProductCards(products, language) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  
  // 默认图片
  const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
  
  // 按钮文字根据语言切换
  const viewDetailsText = language === 'zh' ? '查看详情' : 'View Details';
  const addToCartText = language === 'zh' ? '加购物车' : 'Add to Cart';
  const modelText = language === 'zh' ? '型号' : 'Model';
  
  products.slice(0, 3).forEach((p, index) => {
    // 构建产品链接
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/search?q=${p.product_id}`;
    
    // 购物车链接
    const cartUrl = `${STORE_URL}/cart/add?id=${p.product_id}&quantity=1`;
    
    // 修复图片URL
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = 'https://cdn.shopify.com' + imageUrl;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = 'https://' + imageUrl;
      }
    }
    
    // 产品卡片HTML
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; max-width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\n`;
    
    // 图片和基本信息行
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    
    // 图片
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title || 'Bear Product'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${defaultImage}'; this.style.objectFit='contain'; this.style.padding='10px';">\n`;
    cards += `</div>\n`;
    
    // 标题、型号、价格
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${p.title || 'Bear Product'}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">${modelText}: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    // 简短描述（修复截断问题）
    if (p.description_short) {
      let cleanDesc = p.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim();
      
      // 智能截断：在完整单词处截断
      if (cleanDesc.length > 100) {
        let truncated = cleanDesc.substring(0, 100);
        // 找到最后一个空格的位置
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 0) {
          truncated = truncated.substring(0, lastSpace);
        }
        cleanDesc = truncated + '...';
      }
      
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}</div>\n`;
    }
    
    // 按钮组
    cards += `<div style="display: flex; gap: 10px; margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 ${viewDetailsText}</a>\n`;
    cards += `<a href="${cartUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🛒 ${addToCartText}</a>\n`;
    cards += `</div>\n`;
    
    cards += `</div>\n`;
  });
  
  return cards;
}

// 判断是否是FAQ问题
function isFAQQuestion(message) {
  const lowerMsg = message.toLowerCase();
  return FAQ_KEYWORDS.some(keyword => lowerMsg.includes(keyword.toLowerCase()));
}

// 根据用户查询确定产品类别
function determineProductCategory(message) {
  const lowerMsg = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORY_MAP)) {
    if (keywords.some(keyword => lowerMsg.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  
  return null;
}

// 过滤产品，只保留匹配类别的产品
function filterProductsByCategory(products, category, message) {
  if (!category) return products; // 如果没有指定类别，返回所有
  
  const categoryInfo = PRODUCT_CATEGORY_MAP[category];
  if (!categoryInfo) return products;
  
  const lowerMsg = message.toLowerCase();
  
  return products.filter(p => {
    // 检查产品ID是否匹配
    const productId = p.product_id || '';
    if (categoryInfo.some(keyword => productId.includes(keyword))) {
      return true;
    }
    
    // 检查产品标题是否匹配
    const title = p.title?.toLowerCase() || '';
    if (categoryInfo.some(keyword => title.includes(keyword.toLowerCase()))) {
      return true;
    }
    
    // 检查用户查询是否包含特定型号前缀
    for (const prefix of PRODUCT_PREFIXES) {
      if (lowerMsg.includes(prefix.toLowerCase()) && productId.includes(prefix)) {
        return true;
      }
    }
    
    return false;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userLanguage = detectLanguage(message);
    const lowerMsg = message.toLowerCase();
    
    console.log('🔤 用户语言:', userLanguage);
    console.log('🔍 用户问题:', message);

    // === 第一步：判断是否是FAQ问题 ===
    const isFAQ = isFAQQuestion(message);
    
    // === 第二步：确定产品类别 ===
    const productCategory = determineProductCategory(message);
    console.log('📦 检测到产品类别:', productCategory);

    // === 第三步：搜索知识库 ===
    let products = [];
    let faqs = [];
    
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'all' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        products = searchData.productMatches || [];
        faqs = searchData.faqMatches || [];
        console.log('📊 知识库原始结果:', {
          productCount: products.length,
          faqCount: faqs.length
        });
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 第四步：过滤产品（只保留相关产品）===
    let relevantProducts = [];
    if (!isFAQ) { // FAQ问题不显示产品
      relevantProducts = filterProductsByCategory(products, productCategory, message);
      console.log('🎯 过滤后相关产品:', relevantProducts.length);
    }

    // === 第五步：构建AI提示词 ===
    let productContext = '';
    if (relevantProducts.length > 0) {
      productContext = '【相关产品信息】\n';
      relevantProducts.slice(0, 3).forEach((p, i) => {
        productContext += `${i+1}. 产品名称：${p.title}\n`;
        productContext += `   型号：${p.product_id}\n`;
        productContext += `   价格：$${p.price}\n`;
        productContext += `   描述：${p.description_short?.replace(/<[^>]*>/g, '').substring(0, 150)}...\n\n`;
      });
    }

    let faqContext = '';
    if (faqs.length > 0 && isFAQ) {
      faqContext = '【相关FAQ信息】\n';
      faqs.slice(0, 1).forEach((f, i) => {
        faqContext += `问题：${f.question}\n`;
        faqContext += `答案：${f.answer}\n\n`;
      });
    }

    // === 第六步：调用AI生成回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = userLanguage === 'zh' 
      ? `你是一个专业、友好的电商导购助手，代表 CyberHome 品牌。

【核心职责】
1. 理解用户的问题，用热情、自然的语言回复
2. 如果用户问的是FAQ（退货、保修、配送等），直接回答FAQ问题，不要提产品
3. 如果用户问的是产品，先热情回应，然后简要介绍
4. 回复要简洁明了，不要啰嗦

${faqContext ? '【FAQ参考】\n' + faqContext : ''}
${productContext ? '【产品参考】\n' + productContext : ''}`

      : `You are a professional and friendly e-commerce shopping assistant representing the CyberHome brand.

【Core Responsibilities】
1. Understand user questions and respond in a warm, natural tone
2. If the user asks about FAQ (return, warranty, shipping, etc.), answer directly without mentioning products
3. If the user asks about products, respond enthusiastically and briefly introduce them
4. Keep responses concise and clear

${faqContext ? '【FAQ Reference】\n' + faqContext : ''}
${productContext ? '【Product Reference】\n' + productContext : ''}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 第七步：如果有相关产品且不是FAQ，添加产品卡片 ===
    let finalResponse = aiResponse;
    if (relevantProducts.length > 0 && !isFAQ) {
      const productCards = formatProductCards(relevantProducts, userLanguage);
      const separator = userLanguage === 'zh' ? '\n\n【相关产品】\n' : '\n\n【Related Products】\n';
      finalResponse = aiResponse + separator + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      fromFaq: isFAQ,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'ai_with_products',
      hasProducts: relevantProducts.length > 0,
      language: userLanguage // 返回语言信息
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    res.status(500).json({
      response: 'Sorry, I am a bit busy right now. Please try again later.',
      sessionId: req.body.sessionId || Date.now().toString(),
      error: true,
      timestamp: new Date().toISOString()
    });
  }
}
// pages/api/chat.js - 增强版，充分利用产品描述知识库
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 产品分类映射表
const PRODUCT_CATEGORY_MAP = {
  'rice roll steamer': ['CFJ', 'rice roll', '肠粉机', '米粉机', 'cheong fun', 'rice noodle'],
  'air fryer': ['QZG', '空气炸锅', 'air fryer', '炸锅'],
  'yogurt maker': ['SNJ', 'yogurt', '酸奶机'],
  'baby food': ['SJJ', 'NNQ', 'baby', '婴儿', '辅食', '温奶'],
  'blender': ['LLJ', '搅拌机', 'blender', '榨汁'],
  'juicer': ['YZJ', 'juicer', '榨汁机'],
  'kettle': ['ZDH', 'kettle', '电水壶', '热水壶'],
  'rice cooker': ['DFB', 'rice cooker', '米饭锅', '电饭煲'],
  'dough maker': ['HMJ', '和面机', 'dough maker'],
  'sterilizer': ['XDG', '消毒器', 'sterilizer'],
  'humidifier': ['JSQ', '加湿器', 'humidifier']
};

// 问候语关键词
const GREETING_KEYWORDS = [
  'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
  '您好', '你好', '早上好', '下午好', '晚上好', '哈喽'
];

// FAQ关键词
const FAQ_KEYWORDS = [
  'return', 'refund', 'warranty', 'shipping', 'delivery', 'contact', 
  '退货', '退款', '保修', '运费', '配送', '联系', '客服'
];

// 格式化产品卡片
function formatProductCards(products, language) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
  const viewDetailsText = language === 'zh' ? '查看详情' : 'View Details';
  const addToCartText = language === 'zh' ? '加购物车' : 'Add to Cart';
  const modelText = language === 'zh' ? '型号' : 'Model';
  
  products.slice(0, 3).forEach((p) => {
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/search?q=${p.product_id}`;
    const cartUrl = `${STORE_URL}/cart/add?id=${p.product_id}&quantity=1`;
    
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      else if (imageUrl.startsWith('/')) imageUrl = 'https://cdn.shopify.com' + imageUrl;
      else if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;
    }
    
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white;">\n`;
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${defaultImage}'">\n`;
    cards += `</div>\n`;
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px;">${p.title}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px;">${modelText}: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) cards += `<div style="color: #f97316; font-weight: 600;">💰 $${p.price}</div>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    // 如果有详细描述，取前100个字符
    if (p.description_short) {
      let desc = p.description_short.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').substring(0, 100);
      const lastSpace = desc.lastIndexOf(' ');
      if (lastSpace > 0) desc = desc.substring(0, lastSpace);
      cards += `<div style="color: #4b5563; font-size: 13px; margin: 10px 0;">${desc}...</div>\n`;
    }
    
    cards += `<div style="display: flex; gap: 10px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px;">🔗 ${viewDetailsText}</a>\n`;
    cards += `<a href="${cartUrl}" target="_blank" style="padding: 8px 16px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px;">🛒 ${addToCartText}</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
}

// 判断意图类型
function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // 1. 问候语
  if (GREETING_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'greeting';
  }
  
  // 2. FAQ问题
  if (FAQ_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'faq';
  }
  
  // 3. 产品查询
  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORY_MAP)) {
    if (keywords.some(keyword => lowerMsg.includes(keyword.toLowerCase()))) {
      return 'product';
    }
  }
  
  // 4. 默认
  return 'general';
}

// 获取问候语回复
function getGreetingResponse(language) {
  return language === 'zh' 
    ? '您好！我是CyberHome的AI助手，很高兴为您服务。请问有什么可以帮您的吗？您可以询问产品信息、退货政策、保修等任何问题。'
    : 'Hello! I am the CyberHome AI assistant, happy to help you! Feel free to ask me about product information, return policies, warranty, or any other questions.';
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
    const intent = detectIntent(message);
    
    console.log('🔤 用户语言:', userLanguage);
    console.log('🔍 用户问题:', message);
    console.log('🎯 检测到意图:', intent);

    // === 问候语处理（不显示产品）===
    if (intent === 'greeting') {
      return res.status(200).json({
        response: getGreetingResponse(userLanguage),
        fromFaq: false,
        sessionId: sessionId || Date.now().toString(),
        timestamp: new Date().toISOString(),
        source: 'greeting',
        hasProducts: false
      });
    }

    // === 搜索知识库 ===
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
        console.log('📊 知识库结果:', {
          productCount: products.length,
          faqCount: faqs.length
        });
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 根据意图处理 ===
    let shouldShowProducts = false;
    let relevantProducts = [];
    
    if (intent === 'faq') {
      shouldShowProducts = false; // FAQ不显示产品
    } else if (intent === 'product') {
      shouldShowProducts = products.length > 0;
      relevantProducts = products;
    } else {
      // 一般性问题：如果知识库有产品，可以推荐，但需要AI判断
      shouldShowProducts = products.length > 0;
      relevantProducts = products;
    }

    // === 如果是产品查询，获取更详细的产品描述 ===
    let enhancedProductInfo = '';
    if (relevantProducts.length > 0) {
      enhancedProductInfo = '\n【产品详细信息】\n';
      
      // 为每个匹配的产品获取更详细的描述
      for (const product of relevantProducts.slice(0, 2)) { // 限制为2个产品，避免token过多
        try {
          // 调用产品详情API获取完整描述
          const detailResponse = await fetch(`${FAQ_API_URL}/api/product/${product.product_id}`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            
            enhancedProductInfo += `\n产品名称：${product.title}\n`;
            enhancedProductInfo += `型号：${product.product_id}\n`;
            enhancedProductInfo += `价格：$${product.price}\n`;
            
            // 如果有详细描述片段，将它们组合起来
            if (detailData.descriptions && detailData.descriptions.length > 0) {
              enhancedProductInfo += `详细功能特点：\n`;
              detailData.descriptions.slice(0, 5).forEach((desc, idx) => {
                // 清理HTML标签
                const cleanDesc = desc.chunk_text
                  .replace(/<[^>]*>/g, '')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .trim();
                if (cleanDesc && cleanDesc.length > 10) {
                  enhancedProductInfo += `  • ${cleanDesc}\n`;
                }
              });
            }
            
            // 如果有完整的产品描述
            if (product.description_short) {
              const cleanDesc = product.description_short
                .replace(/<[^>]*>/g, '')
                .replace(/&amp;/g, '&');
              enhancedProductInfo += `产品概述：${cleanDesc}\n`;
            }
            
            enhancedProductInfo += '\n';
          }
        } catch (error) {
          console.error(`获取产品 ${product.product_id} 详情失败:`, error.message);
        }
      }
    }

    // === 调用AI生成回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 构建上下文
    let context = '';
    if (faqs.length > 0 && intent === 'faq') {
      context += '【相关FAQ信息】\n';
      faqs.slice(0, 1).forEach(f => {
        context += `问题：${f.question}\n答案：${f.answer}\n\n`;
      });
    }

    // 如果有增强的产品信息，优先使用
    if (enhancedProductInfo && shouldShowProducts) {
      context += enhancedProductInfo;
    } else if (relevantProducts.length > 0 && shouldShowProducts) {
      // 如果没有增强信息，使用基础信息
      context += '【相关产品信息】\n';
      relevantProducts.slice(0, 3).forEach((p, i) => {
        context += `${i+1}. ${p.title}\n   型号：${p.product_id}\n   价格：$${p.price}\n`;
        if (p.description_short) {
          const cleanDesc = p.description_short
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .substring(0, 150);
          context += `   描述：${cleanDesc}...\n\n`;
        }
      });
    }

    const systemPrompt = userLanguage === 'zh' 
      ? `你是一个专业、友好的电商导购助手，代表 CyberHome 品牌。

【当前意图】${intent}
${context ? '【参考信息】\n' + context : ''}

【回复规则】
- 如果是FAQ，直接回答问题
- 如果是产品查询，根据产品详细信息热情介绍产品特点和优势
- 如果是一般性问题，友好回应并引导
- 回复要简洁自然，不要啰嗦
- 用热情的语气，可以适当使用表情符号`

      : `You are a professional and friendly e-commerce shopping assistant for CyberHome.

【Intent】${intent}
${context ? '【Reference】\n' + context : ''}

【Response Rules】
- For FAQ: Answer directly
- For product queries: Enthusiastically introduce product features and advantages based on detailed product information
- For general questions: Be friendly and guide the conversation
- Keep responses concise and natural
- Use a warm tone, emojis are welcome`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 添加产品卡片（如果需要）===
    let finalResponse = aiResponse;
    if (shouldShowProducts && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts, userLanguage);
      const separator = userLanguage === 'zh' ? '\n\n【相关产品】\n' : '\n\n【Related Products】\n';
      finalResponse = aiResponse + separator + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      fromFaq: intent === 'faq',
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'ai_with_context',
      hasProducts: shouldShowProducts && relevantProducts.length > 0,
      intent: intent
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
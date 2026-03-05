// pages/api/chat.js - 精确控制版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 格式化产品卡片 - 只保留View Details按钮
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  
  // 使用Shopify的图片占位符
  const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
  
  products.slice(0, 3).forEach((p) => {
    // 正确的产品链接格式：/products/handle
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/products/${p.product_id}`;
    
    // 正确的图片URL - 直接使用原始URL
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = 'https://' + imageUrl;
      }
    }
    
    // 清理描述中的HTML
    let cleanDesc = '';
    if (p.description_short) {
      cleanDesc = p.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanDesc.length > 120) {
        const lastSpace = cleanDesc.substring(0, 120).lastIndexOf(' ');
        cleanDesc = cleanDesc.substring(0, lastSpace > 0 ? lastSpace : 120) + '...';
      }
    }
    
    // 产品卡片HTML - 只保留View Details按钮
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">\n`;
    
    // 图片和基本信息行
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title || 'Bear Product'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${defaultImage}';">\n`;
    cards += `</div>\n`;
    
    // 产品信息
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px; color: #333;">${p.title || 'Bear Product'}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px; margin: 4px 0;">Model: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    // 描述
    if (cleanDesc) {
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}</div>\n`;
    }
    
    // 只保留View Details按钮
    cards += `<div style="margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 View Details</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
}

// 判断用户意图 - 更精确的温度控制
function detectIntent(message, history) {
  const lowerMsg = message.toLowerCase().trim();
  
  // 1. 问候语 - 绝对不显示产品
  const greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 
    'hola', 'bonjour', '你好', '您好', '哈喽', '早上好', '下午好', '晚上好'
  ];
  if (greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' ') || lowerMsg.endsWith(' ' + g))) {
    return 'greeting';
  }
  
  // 2. 简单社交 - 不显示产品
  const socialPhrases = [
    'thank', 'thanks', 'bye', 'goodbye', 'see you', 'thanks for help', 
    'that is all', 'that\'s all', 'ok', 'okay', 'great', 'awesome',
    '谢谢', '再见', '好的', '明白了'
  ];
  if (socialPhrases.some(p => lowerMsg.includes(p) && lowerMsg.length < 30)) {
    return 'social';
  }
  
  // 3. FAQ类问题 - 绝对不显示产品
  const faqKeywords = [
    'shipping', 'delivery', 'return', 'refund', 'warranty', 'contact', 
    'policy', 'ship', 'send', 'arrive', '多久能到', '什么时候到',
    '运费', '退货', '退款', '保修', '联系', '客服', 'canada', 'mexico',
    '电压', 'voltage', 'certification', '安全认证'
  ];
  if (faqKeywords.some(k => lowerMsg.includes(k))) {
    return 'faq';
  }
  
  // 4. 明确的产品查询 - 才显示产品
  const productQueries = [
    'do you have', 'have you got', 'looking for', 'need a', 'want a',
    '推荐', '有吗', '多少钱', '价格', '型号', '买', '购买', '卖',
    'air fryer', 'toaster', 'kettle', 'blender', 'juicer', 'yogurt',
    'rice cooker', 'humidifier', 'massager', '肠粉机', '酸奶机', '空气炸锅',
    'steamer', 'sterilizer', 'warmer', 'maker'
  ];
  
  if (productQueries.some(q => lowerMsg.includes(q))) {
    return 'product_query';
  }
  
  // 5. 如果是追问上一条消息的产品
  const followUpPhrases = [
    'tell me more', 'more details', 'about that', '那个', '这个', '它', 
    'tell me about', 'what about', 'how about', 'details please'
  ];
  if (followUpPhrases.some(p => lowerMsg.includes(p)) && history.lastIntent === 'product_query') {
    return 'product_followup';
  }
  
  // 6. 默认 - 一般对话，不显示产品
  return 'general';
}

// 获取产品类型关键词（用于温度控制）
function getProductTypeFromMessage(message) {
  const lowerMsg = message.toLowerCase();
  
  const productTypes = {
    'air fryer': ['air fryer', '空气炸锅', '炸锅'],
    'toaster': ['toaster', '面包机', '吐司机'],
    'kettle': ['kettle', '电水壶', '热水壶'],
    'blender': ['blender', '搅拌机', '榨汁机'],
    'juicer': ['juicer', '原汁机'],
    'yogurt maker': ['yogurt', '酸奶机'],
    'rice cooker': ['rice cooker', '电饭煲', '米饭锅'],
    'humidifier': ['humidifier', '加湿器'],
    'massager': ['massager', '按摩器'],
    'rice roll steamer': ['rice roll', '肠粉机', '米粉机'],
    'sterilizer': ['sterilizer', '消毒器']
  };
  
  for (const [type, keywords] of Object.entries(productTypes)) {
    if (keywords.some(k => lowerMsg.includes(k))) {
      return type;
    }
  }
  
  return null;
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

    console.log('🔍 用户问题:', message);
    console.log('🆔 会话ID:', sessionId);

    // === 获取会话历史 ===
    let history = conversationHistory.get(sessionId) || {
      messages: [],
      lastIntent: 'unknown',
      lastProducts: [],
      lastProductType: null
    };

    // === 检测意图 ===
    const intent = detectIntent(message, history);
    const productType = getProductTypeFromMessage(message);
    
    console.log('🎯 检测到意图:', intent);
    console.log('📦 产品类型:', productType);

    // === 搜索知识库 ===
    let relevantProducts = [];
    let faqInfo = '';
    
    try {
      // 只有明确的产品查询才搜索产品
      if (intent === 'product_query' || intent === 'product_followup') {
        const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, type: 'product' })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          // 过滤产品，确保匹配产品类型
          if (productType) {
            relevantProducts = (searchData.productMatches || []).filter(p => {
              const title = p.title?.toLowerCase() || '';
              const desc = p.description_short?.toLowerCase() || '';
              const type = productType.toLowerCase();
              
              return title.includes(type) || desc.includes(type);
            });
          } else {
            relevantProducts = searchData.productMatches || [];
          }
          
          console.log('📦 找到相关产品:', relevantProducts.length);
        }
      }
      
      // 如果是FAQ，搜索FAQ
      if (intent === 'faq') {
        const faqResponse = await fetch(`${FAQ_API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, type: 'faq' })
        });

        if (faqResponse.ok) {
          const faqData = await faqResponse.json();
          if (faqData.faqMatches && faqData.faqMatches.length > 0) {
            faqInfo = faqData.faqMatches[0].answer;
          }
        }
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 构建对话上下文 ===
    let conversationContext = '';
    if (history.messages.length > 0) {
      conversationContext = 'Previous conversation:\n';
      const recentMessages = history.messages.slice(-4);
      recentMessages.forEach(msg => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }

    // === 构建AI提示词 ===
    let systemPrompt = `You are a friendly and professional shopping assistant for CyberHome.

${conversationContext}

Current user intent: ${intent}
${productType ? `Product being asked about: ${productType}` : ''}

Your task:
1. Respond in the SAME language the user used
2. Based on their intent:
   - greeting/social: Be warm and friendly
   - faq: Provide accurate information about policies
   - product_query/followup: Enthusiastically mention we have relevant products
   - general: Answer helpfully

${faqInfo ? 'FAQ Information: ' + faqInfo : ''}

CRITICAL RULES:
- ONLY mention products if intent is product_query or product_followup
- NEVER recommend products for greetings, thanks, or FAQ questions
- NEVER list product names or details in your response
- Keep responses concise and natural

Brand info:
- Website: ${STORE_URL}
- Service: US & Canada only`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.messages.slice(-6),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 200,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 更新会话历史 ===
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    history.lastIntent = intent;
    history.lastProducts = relevantProducts;
    history.lastProductType = productType;
    
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    
    conversationHistory.set(sessionId, history);

    // === 决定是否显示产品卡片 ===
    const shouldShowProducts = (intent === 'product_query' || intent === 'product_followup') && 
                               relevantProducts.length > 0 &&
                               productType !== null; // 必须有明确的产品类型才显示

    let finalResponse = aiResponse;
    if (shouldShowProducts) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      source: 'ai_with_context',
      hasProducts: shouldShowProducts,
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
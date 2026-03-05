// pages/api/chat.js - 带上下文记忆版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = (process.env.FAQ_API_URL || 'https://cyberhome-faq-api-production.up.railway.app').replace(/\/+$/, '');

// 简单的内存存储（生产环境应使用Redis）
const conversationHistory = new Map();

// 格式化产品卡片
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  const defaultImage = 'https://placehold.co/80x80/1890ff/white?text=Bear';
  
  products.slice(0, 3).forEach((p) => {
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/products/${p.product_id}`;
    
    const cartUrl = `${STORE_URL}/cart/${p.product_id}:1`;
    
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      else if (imageUrl.startsWith('/')) imageUrl = 'https://cdn.shopify.com' + imageUrl;
      else if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;
      imageUrl = imageUrl.replace(/^http:/, 'https:');
      imageUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_100x100.$1');
    }
    
    let cleanDesc = '';
    if (p.description_short) {
      cleanDesc = p.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanDesc.length > 100) {
        const lastSpace = cleanDesc.substring(0, 100).lastIndexOf(' ');
        cleanDesc = cleanDesc.substring(0, lastSpace > 0 ? lastSpace : 100) + '...';
      }
    }
    
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">\n`;
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title || 'Bear Product'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${defaultImage}';">\n`;
    cards += `</div>\n`;
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px; color: #333;">${p.title || 'Bear Product'}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px; margin: 4px 0;">Model: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    if (cleanDesc) {
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}</div>\n`;
    }
    
    cards += `<div style="display: flex; gap: 10px; margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 View Details</a>\n`;
    cards += `<a href="${cartUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🛒 Add to Cart</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
}

// 判断是否应该显示产品
function shouldShowProducts(message, products, history) {
  if (!products || products.length === 0) return false;
  
  const lowerMsg = message.toLowerCase().trim();
  
  // 如果上一条消息是关于产品的，这次可能是追问
  if (history && history.lastIntent === 'product') {
    return true;
  }
  
  // 问候语 - 不显示产品
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'hola', 'bonjour', '你好'];
  if (greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' '))) {
    return false;
  }
  
  // FAQ类问题 - 不显示产品
  const faqKeywords = ['shipping', 'delivery', 'return', 'refund', 'warranty', 'contact', 'policy', 'ship', 'send'];
  if (faqKeywords.some(k => lowerMsg.includes(k))) {
    return false;
  }
  
  // 明确的产品查询
  const productKeywords = ['buy', 'product', 'have', 'got', 'looking', 'need', 'want', 'price', 'cost', '型号', '多少钱', '有吗', '推荐'];
  if (productKeywords.some(k => lowerMsg.includes(k))) {
    return true;
  }
  
  // 包含产品类型
  const productTypes = ['air fryer', 'toaster', 'kettle', 'blender', 'juicer', 'yogurt', 'rice cooker', 'humidifier', 'massager', '肠粉机', '酸奶机'];
  if (productTypes.some(t => lowerMsg.includes(t))) {
    return true;
  }
  
  return false;
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

    // === 获取或创建会话历史 ===
    let history = conversationHistory.get(sessionId) || {
      messages: [],
      lastIntent: 'unknown',
      lastProducts: []
    };

    // === 搜索知识库获取相关产品 ===
    let relevantProducts = [];
    let faqInfo = '';
    let isProductQuery = false;
    
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'all' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        // Only keep products that are actually in stock (production requires stock_status === 'in_stock')
        relevantProducts = (searchData.productMatches || []).filter(p => (p?.stock_status || '').toLowerCase() === 'in_stock');
        // Cap to max 3 product cards
        relevantProducts = relevantProducts.slice(0, 3);
        
        // 判断是否是产品查询
        isProductQuery = shouldShowProducts(message, relevantProducts, history);
        
        if (searchData.faqMatches && searchData.faqMatches.length > 0) {
          faqInfo = searchData.faqMatches[0].answer;
        }
        
        console.log('📦 找到相关产品:', relevantProducts.length);
        console.log('🎯 是产品查询:', isProductQuery);
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 构建对话上下文 ===
    let conversationContext = '';
    if (history.messages.length > 0) {
      conversationContext = 'Previous conversation:\n';
      // 只保留最近3轮对话
      const recentMessages = history.messages.slice(-6);
      recentMessages.forEach(msg => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }

    // === 构建AI提示词 ===
    let systemPrompt = `You are a friendly and professional shopping assistant for CyberHome, an online store selling home appliances.

${conversationContext}

Your task:
1. Understand the user's question in ANY language and respond in the SAME language they used.
2. Maintain conversation context - remember what was discussed earlier.
3. Respond appropriately based on the context:
   - If it's a follow-up question, reference previous conversation
   - If they're greeting you: Respond warmly
   - If they're asking about policies: Provide accurate information
   - If they're asking about products: Enthusiastically mention relevant products
   - If they're asking general questions: Answer helpfully

${faqInfo ? 'Here is relevant FAQ information: ' + faqInfo : ''}

Important guidelines:
- Be warm and friendly, use emojis appropriately 😊
- Keep responses concise but helpful
- Maintain natural conversation flow
- If they ask about a product you just mentioned, provide more details
- Do NOT list product names or details in your response (product cards will be shown separately)

Brand info:
- Website: ${STORE_URL}
- Service: US & Canada only`;

    // 如果是产品查询，添加产品上下文
    if (isProductQuery && relevantProducts.length > 0) {
      systemPrompt += '\n\nRelevant products are available. I will show product cards separately. Just acknowledge that we have relevant products in your response.';
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 构建消息历史
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.messages.slice(-10), // 最多保留10条历史消息
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.8,
      max_tokens: 300,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 更新会话历史 ===
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    history.lastIntent = isProductQuery ? 'product' : 'general';
    history.lastProducts = relevantProducts;
    
    // 限制历史长度，避免无限增长
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    
    conversationHistory.set(sessionId, history);

    // === 只有明确的产品查询才显示产品卡片 ===
    let finalResponse = aiResponse;
    if (isProductQuery && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      source: 'ai_with_context',
      hasProducts: isProductQuery && relevantProducts.length > 0
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
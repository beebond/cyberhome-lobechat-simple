// pages/api/chat.js - AI全权负责版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 格式化产品卡片
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  const defaultImage = 'https://placehold.co/80x80/f5f5f5/999999?text=Bear';
  
  products.slice(0, 3).forEach((p) => {
    if (!p.handle) return;
    
    const productUrl = `${STORE_URL}/products/${p.handle}`;
    const imageUrl = p.image_url || defaultImage;
    
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
    
    cards += `<div style="margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 Buy Now</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
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

    // === 1. 获取会话历史 ===
    let history = conversationHistory.get(sessionId) || {
      messages: [],
      lastIntent: 'unknown'
    };

    // === 2. 搜索知识库获取相关信息 ===
    let faqResults = [];
    let productResults = [];
    
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'all' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        faqResults = searchData.faqMatches || [];
        productResults = searchData.productMatches || [];
        console.log('📚 FAQ结果:', faqResults.length);
        console.log('📦 产品结果:', productResults.length);
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 3. 让AI判断意图并生成回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 构建上下文
    let context = '';
    
    if (faqResults.length > 0) {
      context += '\n【FAQ Reference】\n';
      faqResults.slice(0, 2).forEach((faq, i) => {
        context += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }
    
    if (productResults.length > 0) {
      context += '\n【Product Reference】\n';
      productResults.slice(0, 3).forEach((p, i) => {
        context += `${i+1}. ${p.title}\n`;
        context += `   Model: ${p.product_id}\n`;
        context += `   Price: $${p.price}\n`;
        context += `   Description: ${p.description_short?.replace(/<[^>]*>/g, '').substring(0, 150)}...\n\n`;
      });
    }

    const systemPrompt = `You are a professional and friendly shopping assistant for CyberHome.

【Your Task】
1. Understand the user's question and determine if they are asking about:
   - FAQ/Policies (shipping, returns, warranty, contact, etc.)
   - Products (looking to buy, need recommendations, product details)
   - General conversation (greetings, thanks, casual chat)

2. Based on their intent:
   - For FAQ: Use the FAQ reference to provide accurate information, but rephrase naturally
   - For product inquiries: Enthusiastically recommend products from the product reference
   - For general chat: Be friendly and helpful

3. Response guidelines:
   - Use the SAME language as the user
   - Be warm and friendly, use emojis appropriately 😊
   - Keep responses concise but helpful
   - DO NOT list product details in your text response (cards will be shown separately)
   - For product recommendations, just mention that you found some products

${context ? '【Reference Information】\n' + context : ''}

【Brand Info】
- Website: ${STORE_URL}
- Main products: air fryers, baby food makers, bottle sterilizers, bottle warmers, juicers, electric kettles, rice roll steamers, dough makers, yogurt makers, etc.
- Service: US & Canada only
- Voltage: 110-120V`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.messages.slice(-4),
        { role: 'user', content: message }
      ],
      temperature: 0.5,
      max_tokens: 250,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 4. AI自己决定是否推荐产品 ===
    // 让AI在回复中标记是否需要产品卡片
    const shouldShowProducts = productResults.length > 0 && 
      !aiResponse.toLowerCase().includes('just greeting') &&
      !message.toLowerCase().match(/^(hello|hi|hey|thanks|thank you|bye)$/i);

    // === 5. 构建最终回复 ===
    let finalResponse = aiResponse;
    
    if (shouldShowProducts) {
      const productCards = formatProductCards(productResults);
      if (productCards) {
        finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
      }
    }

    // === 6. 更新历史 ===
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    conversationHistory.set(sessionId, history);

    res.status(200).json({
      response: finalResponse,
      sessionId,
      timestamp: new Date().toISOString(),
      source: 'ai_judged',
      hasProducts: shouldShowProducts
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    res.status(200).json({
      response: 'How can I help you with your home appliance needs today?',
      sessionId: req.body.sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'fallback',
      hasProducts: false
    });
  }
}
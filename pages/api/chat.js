// pages/api/chat.js - 自动识别架构
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
    if (!p.handle) {
      console.warn('跳过没有handle的产品:', p.product_id);
      return;
    }
    
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
    console.log('🆔 会话ID:', sessionId);

    // === 1. 让AI理解用户意图 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 获取会话历史
    let history = conversationHistory.get(sessionId) || {
      messages: [],
      lastIntent: 'unknown'
    };

    // 构建意图识别提示
    const intentPrompt = `You are an intent classifier for a shopping assistant. Analyze the user's message and determine their intent.

Previous conversation:
${history.messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

Current user message: "${message}"

Classify the intent into exactly one of these categories:
- greeting: User is saying hello, hi, good morning, etc.
- policy: User is asking about shipping, returns, warranty, Canada, Mexico, contact, etc.
- product: User is asking about buying, looking for, need, want, price, specific products, etc.
- general: Anything else, casual conversation, thanks, bye, etc.

Return only the category name, nothing else.`;

    const intentCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an intent classifier. Return only the category name.' },
        { role: 'user', content: intentPrompt }
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const intent = intentCompletion.choices[0].message.content.toLowerCase().trim();
    console.log('🎯 AI识别的意图:', intent);

    // === 2. 根据意图处理 ===
    
    // 政策类问题 - 直接返回预定义答案
    if (intent === 'policy') {
      const policyResponses = {
        shipping: 'Standard shipping takes 5-7 business days within the US. Expedited shipping (2-3 days) is available for an additional fee.',
        return: 'You can return your order within 30 days of receiving it. Please make sure the item is in its original condition with all tags attached.',
        warranty: 'Our products come with a 1-year warranty covering manufacturing defects. Please contact our support team with your order number to start a warranty claim.',
        canada: 'Yes, we currently serve customers in the US and Canada only.',
        default: 'For questions about shipping, returns, or policies, please visit our website footer or contact support@cyberhome.app'
      };
      
      let response = policyResponses.default;
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('shipping') || lowerMsg.includes('delivery')) {
        response = policyResponses.shipping;
      } else if (lowerMsg.includes('return') || lowerMsg.includes('refund')) {
        response = policyResponses.return;
      } else if (lowerMsg.includes('warranty')) {
        response = policyResponses.warranty;
      } else if (lowerMsg.includes('canada')) {
        response = policyResponses.canada;
      }
      
      // 更新历史
      history.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
      history.lastIntent = intent;
      conversationHistory.set(sessionId, history);
      
      return res.status(200).json({
        response,
        sessionId,
        timestamp: new Date().toISOString(),
        source: 'policy',
        hasProducts: false
      });
    }

    // === 3. 产品查询 - 调用知识库API搜索 ===
    let relevantProducts = [];
    let aiResponse = '';

    if (intent === 'product') {
      try {
        // 直接调用知识库API搜索
        const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, type: 'product' })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          relevantProducts = searchData.productMatches || [];
          console.log('📦 API返回产品数量:', relevantProducts.length);
        }
      } catch (error) {
        console.error('产品搜索失败:', error.message);
      }

      // 让AI生成回复
      const productContext = relevantProducts.length > 0 
        ? `Found ${relevantProducts.length} relevant products. First one: ${relevantProducts[0].title}`
        : 'No products found in knowledge base.';

      const responsePrompt = `You are a friendly shopping assistant for CyberHome.

User asked: "${message}"

${productContext}

Response guidelines:
- If products were found, enthusiastically tell them what you found (be brief)
- If no products were found, apologize and offer to notify them
- Keep response concise (1-2 sentences)
- Use the same language as the user
- Do NOT list product details - cards will be shown separately`;

      const responseCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful shopping assistant.' },
          { role: 'user', content: responsePrompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      aiResponse = responseCompletion.choices[0].message.content;
    } else {
      // 通用对话 - 让AI自由回复
      const generalPrompt = `You are a friendly shopping assistant for CyberHome.

User: "${message}"

Previous conversation:
${history.messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

Respond naturally and helpfully. If they're greeting you, greet back. If they're asking general questions, answer briefly. Use the same language as the user.`;

      const generalCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful shopping assistant.' },
          { role: 'user', content: generalPrompt }
        ],
        temperature: 0.5,
        max_tokens: 150,
      });

      aiResponse = generalCompletion.choices[0].message.content;
    }

    // === 4. 构建最终回复 ===
    let finalResponse = aiResponse;
    
    // 只有产品查询且有结果时才显示产品卡片
    if (intent === 'product' && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }

    // 更新历史
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    history.lastIntent = intent;
    conversationHistory.set(sessionId, history);

    res.status(200).json({
      response: finalResponse,
      sessionId,
      timestamp: new Date().toISOString(),
      source: intent,
      hasProducts: intent === 'product' && relevantProducts.length > 0
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
// pages/api/chat.js - 稳定版修复
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 格式化产品卡片 - 确保始终返回有效HTML
function formatProductCards(products) {
  if (!products || products.length === 0) {
    return '';
  }
  
  let cards = '';
  const defaultImage = 'https://placehold.co/80x80/f5f5f5/999999?text=Bear';
  
  // 限制最多显示3个产品
  const maxProducts = Math.min(products.length, 3);
  
  for (let i = 0; i < maxProducts; i++) {
    const p = products[i];
    
    // 必须有handle才能构建链接
    if (!p || !p.handle) {
      console.warn('跳过无效产品:', p?.product_id);
      continue;
    }
    
    try {
      const productUrl = `${STORE_URL}/products/${p.handle}`;
      const imageUrl = p.image_url || defaultImage;
      
      // 安全地清理描述
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
    } catch (error) {
      console.error('格式化产品卡片失败:', error.message);
      continue;
    }
  }
  
  return cards;
}

export default async function handler(req, res) {
  // 设置超时保护
  res.setHeader('Connection', 'keep-alive');
  
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
      lastIntent: 'unknown'
    };

    // === 1. 先用知识库搜索产品（无论意图，先获取数据）===
    let relevantProducts = [];
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'product' }),
        timeout: 5000 // 5秒超时
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        relevantProducts = searchData.productMatches || [];
        console.log('📦 搜索到产品数量:', relevantProducts.length);
      }
    } catch (error) {
      console.error('产品搜索失败:', error.message);
      // 继续执行，不要让搜索失败导致整个请求失败
    }

    // === 2. 让AI理解意图 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 简化意图识别，避免复杂prompt
    const lowerMsg = message.toLowerCase();
    let intent = 'general';
    
    // 简单规则判断
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      intent = 'greeting';
    } else if (lowerMsg.includes('shipping') || lowerMsg.includes('delivery') || 
               lowerMsg.includes('return') || lowerMsg.includes('refund') ||
               lowerMsg.includes('warranty') || lowerMsg.includes('canada')) {
      intent = 'policy';
    } else if (lowerMsg.includes('buy') || lowerMsg.includes('looking for') ||
               lowerMsg.includes('need') || lowerMsg.includes('want') ||
               lowerMsg.includes('price') || relevantProducts.length > 0) {
      intent = 'product';
    }

    console.log('🎯 意图:', intent);

    // === 3. 政策类问题直接返回 ===
    if (intent === 'policy') {
      const policyResponses = {
        shipping: 'Standard shipping takes 5-7 business days within the US. Expedited shipping (2-3 days) is available for an additional fee.',
        return: 'You can return your order within 30 days of receiving it. Please make sure the item is in its original condition with all tags attached.',
        warranty: 'Our products come with a 1-year warranty covering manufacturing defects. Please contact our support team with your order number to start a warranty claim.',
        canada: 'Yes, we currently serve customers in the US and Canada only.',
        default: 'For questions about shipping, returns, or policies, please visit our website footer or contact support@cyberhome.app'
      };
      
      let response = policyResponses.default;
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
      conversationHistory.set(sessionId, history);
      
      return res.status(200).json({
        response,
        sessionId,
        timestamp: new Date().toISOString(),
        source: 'policy',
        hasProducts: false
      });
    }

    // === 4. 生成AI回复 ===
    let aiResponse = '';

    try {
      if (intent === 'product' && relevantProducts.length > 0) {
        // 产品查询且有结果
        const productNames = relevantProducts.slice(0, 3).map(p => p.title).join(', ');
        aiResponse = `I found ${relevantProducts.length > 1 ? 'several' : 'a'} product${relevantProducts.length > 1 ? 's' : ''} that might interest you: ${productNames}.`;
      } else if (intent === 'product' && relevantProducts.length === 0) {
        // 产品查询但无结果
        aiResponse = `I couldn't find any products matching "${message}". Would you like to try a different search?`;
      } else if (intent === 'greeting') {
        // 问候
        aiResponse = `Hello! How can I help you with your home appliance needs today?`;
      } else {
        // 通用回复
        aiResponse = `I understand you're asking about "${message}". How can I assist you further?`;
      }
    } catch (error) {
      console.error('生成回复失败:', error.message);
      aiResponse = `How can I help you with your home appliance needs today?`;
    }

    // === 5. 构建最终回复 ===
    let finalResponse = aiResponse;
    
    // 只有产品查询且有结果时才显示产品卡片
    if (intent === 'product' && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      if (productCards) {
        finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
      }
    }

    // 更新历史
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    conversationHistory.set(sessionId, history);

    // 返回成功响应
    return res.status(200).json({
      response: finalResponse,
      sessionId,
      timestamp: new Date().toISOString(),
      source: intent,
      hasProducts: intent === 'product' && relevantProducts.length > 0
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    // 即使出错也返回友好消息
    return res.status(200).json({
      response: 'How can I help you with your home appliance needs today?',
      sessionId: req.body.sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'fallback',
      hasProducts: false
    });
  }
}
// pages/api/chat.js - 恢复产品卡片显示版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 格式化产品卡片 - 确保显示
function formatProductCards(products) {
  if (!products || products.length === 0) {
    return '';
  }
  
  let cards = '';
  const defaultImage = 'https://placehold.co/80x80/f5f5f5/999999?text=Bear';
  
  console.log('开始格式化产品卡片，产品数量:', products.length);
  
  // 限制最多显示3个产品
  const maxProducts = Math.min(products.length, 3);
  
  for (let i = 0; i < maxProducts; i++) {
    const p = products[i];
    
    if (!p) continue;
    
    try {
      // 必须有handle才能构建链接
      if (!p.handle) {
        console.warn('产品缺少handle:', p.product_id);
        continue;
      }
      
      const productUrl = `${STORE_URL}/products/${p.handle}`;
      const imageUrl = p.image_url || defaultImage;
      
      // 安全地清理描述
      let cleanDesc = '';
      if (p.description_short) {
        cleanDesc = p.description_short
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanDesc.length > 100) {
          const lastSpace = cleanDesc.substring(0, 100).lastIndexOf(' ');
          cleanDesc = cleanDesc.substring(0, lastSpace > 0 ? lastSpace : 100) + '...';
        }
      }
      
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
      
      // Buy Now按钮
      cards += `<div style="margin-top: 12px;">\n`;
      cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 Buy Now</a>\n`;
      cards += `</div>\n`;
      cards += `</div>\n`;
      
      console.log('已生成产品卡片:', p.product_id);
    } catch (error) {
      console.error('格式化产品卡片失败:', error.message);
      continue;
    }
  }
  
  console.log('卡片生成完成，长度:', cards.length);
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

    // === 1. 获取会话历史 ===
    let history = conversationHistory.get(sessionId) || {
      messages: [],
      lastIntent: 'unknown'
    };

    // === 2. 先搜索产品（无论意图，先获取数据）===
    let productResults = [];
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'product' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        productResults = searchData.productMatches || [];
        console.log('📦 产品结果:', productResults.length);
      }
    } catch (error) {
      console.error('产品搜索失败:', error.message);
    }

    // === 3. 简单规则判断意图 ===
    const lowerMsg = message.toLowerCase();
    let intent = 'general';
    let faqAnswer = null;

    // FAQ规则
    if (lowerMsg.includes('shipping') || lowerMsg.includes('delivery') || lowerMsg.includes('ship')) {
      intent = 'faq';
      faqAnswer = 'Standard shipping takes 5-7 business days within the US. Expedited shipping (2-3 days) is available for an additional fee.';
    } else if (lowerMsg.includes('return') || lowerMsg.includes('refund')) {
      intent = 'faq';
      faqAnswer = 'You can return your order within 30 days of receiving it. Please make sure the item is in its original condition with all tags attached.';
    } else if (lowerMsg.includes('warranty')) {
      intent = 'faq';
      faqAnswer = 'Our products come with a 1-year warranty covering manufacturing defects. Please contact our support team with your order number to start a warranty claim.';
    } else if (lowerMsg.includes('canada') || lowerMsg.includes('mexico')) {
      intent = 'faq';
      faqAnswer = 'We currently serve customers in the US and Canada only. Unfortunately, we do not ship to Mexico at this time.';
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      intent = 'greeting';
    } else if (lowerMsg.includes('yogurt') || lowerMsg.includes('maker') || lowerMsg.includes('buy') || 
               lowerMsg.includes('looking for') || lowerMsg.includes('have') || productResults.length > 0) {
      intent = 'product';
    }

    console.log('🎯 意图:', intent);

    // === 4. 处理FAQ ===
    if (intent === 'faq' && faqAnswer) {
      // 更新历史
      history.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: faqAnswer }
      );
      conversationHistory.set(sessionId, history);

      return res.status(200).json({
        response: faqAnswer,
        sessionId,
        timestamp: new Date().toISOString(),
        source: 'faq',
        hasProducts: false
      });
    }

    // === 5. 处理问候 ===
    if (intent === 'greeting') {
      const greeting = 'Hello! 😊 How can I assist you today?';
      
      history.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: greeting }
      );
      conversationHistory.set(sessionId, history);

      return res.status(200).json({
        response: greeting,
        sessionId,
        timestamp: new Date().toISOString(),
        source: 'greeting',
        hasProducts: false
      });
    }

    // === 6. 处理产品查询 ===
    let aiResponse = '';

    if (intent === 'product' && productResults.length > 0) {
      // 产品查询且有结果
      if (productResults.length === 1) {
        aiResponse = `I found a product that might interest you: ${productResults[0].title}.`;
      } else {
        const productNames = productResults.slice(0, 2).map(p => p.title).join(' and ');
        aiResponse = `I found several products that might interest you, including ${productNames}.`;
      }
      
      // 添加产品卡片
      const productCards = formatProductCards(productResults);
      if (productCards) {
        aiResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
      }
    } else {
      // 通用回复
      aiResponse = `How can I help you with your home appliance needs today?`;
    }

    // === 7. 更新历史 ===
    history.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    );
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20);
    }
    conversationHistory.set(sessionId, history);

    res.status(200).json({
      response: aiResponse,
      sessionId,
      timestamp: new Date().toISOString(),
      source: intent,
      hasProducts: intent === 'product' && productResults.length > 0
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
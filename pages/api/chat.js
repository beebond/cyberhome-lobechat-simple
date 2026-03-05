// pages/api/chat.js - 确保产品卡片显示
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 格式化产品卡片 - 强制返回HTML
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
      // 必须有handle才能构建链接，如果没有handle则跳过
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
      
      // 构建产品卡片HTML
      cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">\n`;
      
      // 图片行
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
      console.error('格式化产品卡片失败:', error.message, p);
      continue;
    }
  }
  
  console.log('卡片生成完成，长度:', cards.length);
  return cards;
}

// 过滤相关产品 - 只保留真正匹配的产品
function filterRelevantProducts(products, message) {
  if (!products || products.length === 0) return [];
  
  const lowerMsg = message.toLowerCase();
  
  // 酸奶机相关关键词
  const yogurtKeywords = ['yogurt', 'yaourtière', '酸奶', 'yoghurt'];
  const isYogurtQuery = yogurtKeywords.some(k => lowerMsg.includes(k));
  
  // 如果是酸奶机查询，只返回酸奶机
  if (isYogurtQuery) {
    const yogurtProducts = products.filter(p => 
      p.product_id?.startsWith('SNJ') || 
      p.title?.toLowerCase().includes('yogurt') ||
      p.category?.toLowerCase().includes('yogurt')
    );
    if (yogurtProducts.length > 0) {
      console.log('找到酸奶机产品:', yogurtProducts.length);
      return yogurtProducts;
    }
  }
  
  // 默认返回所有产品
  return products;
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

    // === 1. 先用知识库搜索产品 ===
    let relevantProducts = [];
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'product' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const allProducts = searchData.productMatches || [];
        console.log('📦 API返回产品总数:', allProducts.length);
        
        // 过滤相关产品
        relevantProducts = filterRelevantProducts(allProducts, message);
        console.log('🎯 过滤后相关产品:', relevantProducts.length);
        
        // 打印产品信息
        relevantProducts.forEach(p => {
          console.log(`- ${p.product_id}: ${p.title?.substring(0, 50)}`);
        });
      }
    } catch (error) {
      console.error('产品搜索失败:', error.message);
    }

    // === 2. 简单意图识别 ===
    const lowerMsg = message.toLowerCase();
    let intent = 'general';
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      intent = 'greeting';
    } else if (lowerMsg.includes('shipping') || lowerMsg.includes('delivery') || 
               lowerMsg.includes('return') || lowerMsg.includes('refund') ||
               lowerMsg.includes('warranty') || lowerMsg.includes('canada') ||
               lowerMsg.includes('mexico')) {
      intent = 'policy';
    } else if (lowerMsg.includes('buy') || lowerMsg.includes('looking for') ||
               lowerMsg.includes('need') || lowerMsg.includes('want') ||
               lowerMsg.includes('price') || lowerMsg.includes('have') ||
               relevantProducts.length > 0) {
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
        if (relevantProducts.length === 1) {
          aiResponse = `I found a product that might interest you: ${relevantProducts[0].title}.`;
        } else {
          const productNames = relevantProducts.slice(0, 2).map(p => p.title).join(' and ');
          aiResponse = `I found several products that might interest you, including ${productNames}.`;
        }
      } else if (intent === 'product' && relevantProducts.length === 0) {
        // 产品查询但无结果
        aiResponse = `I couldn't find any products matching "${message}". Would you like to try a different search?`;
      } else if (intent === 'greeting') {
        // 问候
        aiResponse = `Hello! How can I help you with your home appliance needs today?`;
      } else {
        // 通用回复
        aiResponse = `How can I help you with your home appliance needs today?`;
      }
    } catch (error) {
      console.error('生成回复失败:', error.message);
      aiResponse = `How can I help you with your home appliance needs today?`;
    }

    // === 5. 构建最终回复 - 确保产品卡片被添加 ===
    let finalResponse = aiResponse;
    
    // 只有产品查询且有结果时才显示产品卡片
    if (intent === 'product' && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      if (productCards && productCards.length > 0) {
        finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
        console.log('已添加产品卡片到回复');
      } else {
        console.warn('产品卡片生成为空');
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
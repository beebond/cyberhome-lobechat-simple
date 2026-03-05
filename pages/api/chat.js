// pages/api/chat.js - AI驱动 + 产品卡片
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 格式化产品卡片（用于展示）
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  const defaultImage = 'https://placehold.co/80x80/f5f5f5/999999?text=Bear';
  
  products.slice(0, 3).forEach((p) => {
    // 产品链接
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/products/${p.product_id}`;
    
    // 购物车链接 - 使用正确的Shopify格式
    const variantId = p.variant_id || p.product_id;
    const cartUrl = `${STORE_URL}/cart/${variantId}:1`;
    
    // 图片URL处理
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      else if (imageUrl.startsWith('/')) imageUrl = 'https://cdn.shopify.com' + imageUrl;
      else if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;
      // 优化图片大小
      imageUrl = imageUrl.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_100x100.$1');
    }
    
    // 清理描述
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
    
    // 产品卡片HTML
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\n`;
    
    // 图片和标题行
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
    
    // 按钮组
    cards += `<div style="display: flex; gap: 10px; margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 View Details</a>\n`;
    cards += `<a href="${cartUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🛒 Add to Cart</a>\n`;
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

    // === 1. 搜索知识库获取相关产品 ===
    let relevantProducts = [];
    let faqInfo = '';
    
    try {
      const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'all' })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        relevantProducts = searchData.productMatches || [];
        
        // 如果有FAQ，记录下来
        if (searchData.faqMatches && searchData.faqMatches.length > 0) {
          faqInfo = searchData.faqMatches[0].answer;
        }
        
        console.log('📦 找到相关产品:', relevantProducts.length);
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 2. 让AI生成自然语言回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 构建产品上下文
    let productContext = '';
    if (relevantProducts.length > 0) {
      productContext = 'Here are relevant products from our catalog:\n';
      relevantProducts.slice(0, 3).forEach((p, i) => {
        productContext += `${i+1}. ${p.title}\n`;
        productContext += `   Model: ${p.product_id}\n`;
        productContext += `   Price: $${p.price}\n`;
        if (p.description_short) {
          const desc = p.description_short
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .substring(0, 150);
          productContext += `   Description: ${desc}...\n\n`;
        }
      });
    }

    const systemPrompt = `You are a friendly and professional shopping assistant for CyberHome, an online store selling home appliances.

Your task:
1. Understand the user's question in ANY language (English, Spanish, French, Chinese, etc.) and respond in the SAME language they used.
2. Based on their question, determine what they need:
   - If they're greeting you: Respond warmly and ask how you can help
   - If they're asking about products: Enthusiastically tell them about relevant products
   - If they're asking about policies (return, shipping, warranty): Provide accurate information
   - If they're asking general questions: Answer helpfully

${productContext ? 'Here are relevant products you can mention:\n' + productContext : ''}
${faqInfo ? 'Here is relevant FAQ information:\n' + faqInfo : ''}

Important:
- Be warm and friendly, use emojis appropriately 😊
- If there are relevant products, briefly mention them in your response
- I will automatically add product cards after your response, so you don't need to list all details
- Keep your response concise but helpful

Brand info:
- Website: ${STORE_URL}
- Main products: air fryers, baby food makers, bottle sterilizers, bottle warmers, juicers, electric kettles, rice roll steamers, dough makers, yogurt makers, etc.
- Service: US & Canada
- Voltage: 110-120V`;

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

    // === 3. 决定是否显示产品卡片 ===
    const shouldShowProducts = relevantProducts.length > 0 && 
      !aiResponse.toLowerCase().includes('just greeting') &&
      !message.toLowerCase().match(/^(hello|hi|hey|good morning|你好|您好)$/i);

    let finalResponse = aiResponse;
    if (shouldShowProducts) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'ai_with_products',
      hasProducts: shouldShowProducts
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
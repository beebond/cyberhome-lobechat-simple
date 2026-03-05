// pages/api/chat.js - AI驱动 + 结构化产品卡片
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 格式化产品卡片（供AI调用）
function formatProductCards(products, language) {
  let cards = '';
  
  // 默认图片
  const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
  
  products.slice(0, 3).forEach((p, index) => {
    // 构建产品链接
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/search?q=${p.product_id}`;
    
    // 购物车链接（假设使用Shopify）
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
    cards += `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">型号: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    // 简短描述
    if (p.description_short) {
      let cleanDesc = p.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .substring(0, 100);
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}...</div>\n`;
    }
    
    // 按钮组
    cards += `<div style="display: flex; gap: 10px; margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 查看详情</a>\n`;
    cards += `<a href="${cartUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🛒 加购物车</a>\n`;
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

    const userLanguage = detectLanguage(message);
    
    console.log('🔤 用户语言:', userLanguage);
    console.log('🔍 用户问题:', message);

    // === 第一步：搜索知识库获取产品信息 ===
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
        console.log('📊 知识库找到:', {
          productCount: products.length,
          faqCount: faqs.length
        });
      }
    } catch (error) {
      console.error('知识库搜索失败:', error.message);
    }

    // === 第二步：构建AI提示词 ===
    let productContext = '';
    if (products.length > 0) {
      productContext = '【相关产品信息】\n';
      products.slice(0, 5).forEach((p, i) => {
        productContext += `${i+1}. 产品名称：${p.title}\n`;
        productContext += `   型号：${p.product_id}\n`;
        productContext += `   价格：$${p.price}\n`;
        productContext += `   描述：${p.description_short?.replace(/<[^>]*>/g, '').substring(0, 200)}...\n\n`;
      });
    }

    let faqContext = '';
    if (faqs.length > 0) {
      faqContext = '【相关FAQ信息】\n';
      faqs.slice(0, 2).forEach((f, i) => {
        faqContext += `${i+1}. 问题：${f.question}\n`;
        faqContext += `   答案：${f.answer}\n\n`;
      });
    }

    // === 第三步：调用AI生成自然语言回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = userLanguage === 'zh' 
      ? `你是一个专业、友好的电商导购助手，代表 CyberHome 品牌。

【核心职责】
1. 理解用户的问题，用热情、自然的语言回复
2. 如果有相关产品，先简要介绍，然后告诉用户下面会展示详细产品卡片
3. 回复要简洁明了，不要啰嗦
4. 适当使用表情符号让对话更生动

【回复格式要求】
- 先写一段自然语言的回复（介绍、解释、推荐等）
- 然后在最后加上 "【产品详情】" 或 "【相关产品】" 作为分隔
- 产品卡片会自动添加，你不需要在回复中重复产品信息

【品牌信息】
- 官网：${STORE_URL}
- 主营产品：空气炸锅、婴儿辅食机、奶瓶消毒器、温奶器、榨汁机、电水壶、肠粉机、和面机、酸奶机等
- 服务地区：美国、加拿大
- 电压标准：110-120V

${productContext || faqContext ? '【参考信息】\n' + productContext + faqContext : ''}`

      : `You are a professional and friendly e-commerce shopping assistant representing the CyberHome brand.

【Core Responsibilities】
1. Understand user questions and respond in a warm, natural tone
2. If there are relevant products, briefly introduce them and tell the user that product cards will be shown below
3. Keep responses concise and clear
4. Use emojis appropriately

【Response Format】
- Write a natural language response first (introduction, explanation, recommendation)
- Then add "【Product Details】" or "【Related Products】" as a separator
- Product cards will be automatically added, you don't need to repeat product information

【Brand Info】
- Website: ${STORE_URL}
- Main Products: air fryers, baby food makers, sterilizers, bottle warmers, juicers, kettles, rice roll steamers, dough makers, yogurt makers, etc.
- Service Area: US & Canada
- Voltage: 110-120V

${productContext || faqContext ? '【Reference Info】\n' + productContext + faqContext : ''}`;

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

    // === 第四步：如果有产品，添加产品卡片 ===
    let finalResponse = aiResponse;
    if (products.length > 0) {
      const productCards = formatProductCards(products, userLanguage);
      const separator = userLanguage === 'zh' ? '\n\n【相关产品】\n' : '\n\n【Related Products】\n';
      finalResponse = aiResponse + separator + productCards;
    }

    res.status(200).json({
      response: finalResponse,
      fromFaq: false,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: 'ai_with_products',
      hasProducts: products.length > 0
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    res.status(500).json({
      response: userLanguage === 'zh' 
        ? '抱歉，我现在有点忙，请稍后再试。'
        : 'Sorry, I\'m a bit busy right now. Please try again later.',
      sessionId: req.body.sessionId || Date.now().toString(),
      error: true,
      timestamp: new Date().toISOString()
    });
  }
}
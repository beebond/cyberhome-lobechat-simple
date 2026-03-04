// pages/api/chat.js - 完整修复版（FAQ匹配和图片显示）
import OpenAI from 'openai';

// 店铺域名
const STORE_URL = 'https://www.cyberhome.app';

// 本地FAQ关键词白名单
const FAQ_KEYWORDS = [
  // 退货相关
  { 
    keywords: ['return', 'refund', 'send back', '30 days', '退货', '退款', 'return policy', 'return window'], 
    category: 'return' 
  },
  // 保修相关
  { 
    keywords: ['warranty', 'repair', 'broken', 'damage', '保修', '维修', '坏了', '损坏', 'warranty period', '保修期'], 
    category: 'warranty' 
  },
  // 配送相关 - 加强关键词
  { 
    keywords: [
      'shipping', 'delivery', 'ship', 'arrive', 'shipping time', 'delivery time', 
      'when will my order arrive', 'how long does shipping take', '运费', '配送', 
      '发货', '到达', '多久能到', '什么时候到', 'when can i get', 'shipping duration'
    ], 
    category: 'shipping' 
  },
  // 联系客服
  { 
    keywords: ['contact', 'support', '客服', '联系', '帮助', 'customer service', 'email'], 
    category: 'contact' 
  },
  // 关于我们
  { 
    keywords: ['about us', 'company', '品牌', '关于', 'about', 'who are you'], 
    category: 'about' 
  },
  // 电压认证
  { 
    keywords: ['voltage', 'certification', '安全认证', '电压', '110v', '120v', 'certified', 'etl'], 
    category: 'voltage' 
  }
];

// FAQ答案库
const FAQ_ANSWERS = {
  return: {
    en: 'You can return your order within 30 days of receiving it. Please make sure the item is in its original condition with all tags attached.',
    zh: '您可以在收到订单后30天内退货。请确保商品保持原状，所有标签完好无损。'
  },
  warranty: {
    en: 'Our products come with a 1-year warranty covering manufacturing defects. Please contact our support team with your order number to start a warranty claim.',
    zh: '我们的产品提供1年保修，涵盖制造缺陷。请联系客服并提供订单号进行保修申请。'
  },
  shipping: {
    en: 'Standard shipping takes 5-7 business days within the US. Expedited shipping (2-3 days) is available for an additional fee.',
    zh: '美国境内标准配送需要5-7个工作日。加急配送（2-3天）需额外付费。'
  },
  contact: {
    en: 'You can reach our support team at support@cyberhome.app or through the contact form on our website.',
    zh: '您可以通过 support@cyberhome.app 或网站上的联系表单联系客服。'
  },
  about: {
    en: 'CyberHome is a brand focused on modern home appliances, providing innovative kitchen gadgets and smart home solutions for customers in the US and Canada.',
    zh: 'CyberHome 是一家专注于现代家用电器的品牌，为美国和加拿大客户提供创新的厨房设备和智能家居解决方案。'
  },
  voltage: {
    en: 'All our appliances are designed to work with standard U.S. & Canada voltage (110V-120V). They are ETL certified for safety.',
    zh: '我们所有的产品都设计适用于美国和加拿大的标准电压（110V-120V），并通过ETL安全认证。'
  }
};

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 格式化产品列表回复（带图片和按钮）
function formatProductList(products, userQuery, language) {
  let reply = '';
  
  if (language === 'zh') {
    reply = `我为您找到以下产品：\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      // 构建产品链接
      const productUrl = p.handle 
        ? `${STORE_URL}/products/${p.handle}`
        : `${STORE_URL}/search?q=${p.product_id}`;
      
      // 修复图片URL
      let imageUrl = '';
      if (p.image_url) {
        imageUrl = p.image_url.trim();
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = 'https://' + imageUrl;
        }
      }
      
      // 默认图片（如果没有图片）
      const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
      
      // 卡片样式容器
      reply += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; max-width: 100%;">\n`;
      
      // 图片和标题行
      reply += `<div style="display: flex; align-items: center; margin-bottom: 10px;">\n`;
      
      // 产品图片
      reply += `<div style="width: 60px; height: 60px; margin-right: 15px; flex-shrink: 0;">\n`;
      reply += `<img `;
      reply += `src="${imageUrl || defaultImage}" `;
      reply += `alt="${p.title || 'Bear Product'}" `;
      reply += `style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;" `;
      reply += `onerror="this.onerror=null; this.src='${defaultImage}'; this.style.backgroundColor='#f0f0f0'; this.style.padding='10px';" `;
      reply += `/>\n`;
      reply += `</div>\n`;
      
      // 标题和价格
      reply += `<div style="flex: 1;">\n`;
      reply += `<strong style="font-size: 16px;">${index + 1}. ${p.title || 'Bear Product'}</strong>\n`;
      if (p.price) reply += `<br/><span style="color: #f97316; font-weight: bold;">💰 $${p.price}</span>\n`;
      reply += `<br/><span style="color: #666; font-size: 12px;">型号: ${p.product_id || 'N/A'}</span>\n`;
      reply += `</div>\n`;
      reply += `</div>\n`;
      
      // 简短描述
      let cleanDesc = p.description_short
        ?.replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .substring(0, 120) || '';
      if (cleanDesc) reply += `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${cleanDesc}...</p>\n`;
      
      // 按钮组
      reply += `<div style="display: flex; gap: 10px; margin-top: 10px;">\n`;
      reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">🔗 查看详情</a>\n`;
      reply += `<span style="display: inline-block; padding: 8px 16px; background-color: #f3f4f6; color: #374151; border-radius: 6px; font-size: 14px;">📦 ${p.product_id}</span>\n`;
      reply += `</div>\n`;
      
      reply += `</div>\n\n`;
    });
    
    reply += `<p style="margin-top: 10px; color: #6b7280; font-style: italic;">💡 点击"查看详情"按钮查看完整信息，或回复型号获取更多参数。</p>`;
    
  } else {
    // 英文版
    reply = `I found these products for you:\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      const productUrl = p.handle 
        ? `${STORE_URL}/products/${p.handle}`
        : `${STORE_URL}/search?q=${p.product_id}`;
      
      let imageUrl = '';
      if (p.image_url) {
        imageUrl = p.image_url.trim();
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = 'https://' + imageUrl;
        }
      }
      
      const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
      
      reply += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; max-width: 100%;">\n`;
      
      reply += `<div style="display: flex; align-items: center; margin-bottom: 10px;">\n`;
      
      reply += `<div style="width: 60px; height: 60px; margin-right: 15px; flex-shrink: 0;">\n`;
      reply += `<img `;
      reply += `src="${imageUrl || defaultImage}" `;
      reply += `alt="${p.title || 'Bear Product'}" `;
      reply += `style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;" `;
      reply += `onerror="this.onerror=null; this.src='${defaultImage}'; this.style.backgroundColor='#f0f0f0'; this.style.padding='10px';" `;
      reply += `/>\n`;
      reply += `</div>\n`;
      
      reply += `<div style="flex: 1;">\n`;
      reply += `<strong style="font-size: 16px;">${index + 1}. ${p.title || 'Bear Product'}</strong>\n`;
      if (p.price) reply += `<br/><span style="color: #f97316; font-weight: bold;">💰 $${p.price}</span>\n`;
      reply += `<br/><span style="color: #666; font-size: 12px;">Model: ${p.product_id || 'N/A'}</span>\n`;
      reply += `</div>\n`;
      reply += `</div>\n`;
      
      let cleanDesc = p.description_short
        ?.replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .substring(0, 120) || '';
      if (cleanDesc) reply += `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${cleanDesc}...</p>\n`;
      
      reply += `<div style="display: flex; gap: 10px; margin-top: 10px;">\n`;
      reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">🔗 View Details</a>\n`;
      reply += `<span style="display: inline-block; padding: 8px 16px; background-color: #f3f4f6; color: #374151; border-radius: 6px; font-size: 14px;">📦 ${p.product_id}</span>\n`;
      reply += `</div>\n`;
      
      reply += `</div>\n\n`;
    });
    
    reply += `<p style="margin-top: 10px; color: #6b7280; font-style: italic;">💡 Click "View Details" for more info, or reply with model number.</p>`;
  }
  
  return reply;
}

// 格式化产品详情回复
function formatProductDetail(product, descriptions, language) {
  let reply = '';
  
  if (language === 'zh') {
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/search?q=${product.product_id}`;
    
    let imageUrl = '';
    if (product.image_url) {
      imageUrl = product.image_url.trim();
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = 'https://' + imageUrl;
      }
    }
    
    const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
    
    reply += `<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; max-width: 100%;">\n`;
    
    if (imageUrl) {
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="200" height="200" style="border-radius: 12px; max-width: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='${defaultImage}';" />\n`;
      reply += `</div>\n`;
    }
    
    reply += `<h2 style="margin: 0 0 10px 0; font-size: 20px;">${product.title}</h2>\n`;
    
    reply += `<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 型号</td><td style="padding: 8px;">${product.product_id}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">💰 价格</td><td style="padding: 8px; color: #f97316; font-weight: bold;">$${product.price}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">🏷️ 品牌</td><td style="padding: 8px;">${product.vendor || 'Bear'}</td></tr>\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ 有货' : '⚠️ 需查询';
      reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 库存</td><td style="padding: 8px;">${stockText}</td></tr>\n`;
    }
    reply += `</table>\n`;
    
    if (product.description_short) {
      let cleanDesc = product.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&');
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">📝 产品描述</h3>\n`;
      reply += `<p style="color: #4b5563;">${cleanDesc}</p>\n`;
      reply += `</div>\n`;
    }
    
    reply += `<div style="margin-top: 20px; text-align: center;">\n`;
    reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">🛒 查看商品页</a>\n`;
    reply += `</div>\n`;
    
    reply += `</div>\n`;
    
  } else {
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/search?q=${product.product_id}`;
    
    let imageUrl = '';
    if (product.image_url) {
      imageUrl = product.image_url.trim();
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = 'https://' + imageUrl;
      }
    }
    
    const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
    
    reply += `<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; max-width: 100%;">\n`;
    
    if (imageUrl) {
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="200" height="200" style="border-radius: 12px; max-width: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='${defaultImage}';" />\n`;
      reply += `</div>\n`;
    }
    
    reply += `<h2 style="margin: 0 0 10px 0; font-size: 20px;">${product.title}</h2>\n`;
    
    reply += `<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 Model</td><td style="padding: 8px;">${product.product_id}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">💰 Price</td><td style="padding: 8px; color: #f97316; font-weight: bold;">$${product.price}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">🏷️ Brand</td><td style="padding: 8px;">${product.vendor || 'Bear'}</td></tr>\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ In Stock' : '⚠️ Check Availability';
      reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 Stock</td><td style="padding: 8px;">${stockText}</td></tr>\n`;
    }
    reply += `</table>\n`;
    
    if (product.description_short) {
      let cleanDesc = product.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&');
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">📝 Description</h3>\n`;
      reply += `<p style="color: #4b5563;">${cleanDesc}</p>\n`;
      reply += `</div>\n`;
    }
    
    reply += `<div style="margin-top: 20px; text-align: center;">\n`;
    reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">🛒 View Product</a>\n`;
    reply += `</div>\n`;
    
    reply += `</div>\n`;
  }
  
  return reply;
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
    const lowerMsg = message.toLowerCase();
    
    console.log('🔤 用户语言:', userLanguage);
    console.log('🔍 用户问题:', message);

    // === 第一步：检查是否是FAQ类问题（优先级最高）===
    const matchedFaqCategory = FAQ_KEYWORDS.find(category => 
      category.keywords.some(keyword => lowerMsg.includes(keyword.toLowerCase()))
    );

    if (matchedFaqCategory) {
      console.log('📚 检测到FAQ类别:', matchedFaqCategory.category);
      
      const answer = FAQ_ANSWERS[matchedFaqCategory.category]?.[userLanguage] || 
                     FAQ_ANSWERS[matchedFaqCategory.category]?.en ||
                     'Please contact our support team for more information.';

      return res.status(200).json({
        response: answer,
        fromFaq: true,
        sessionId: sessionId || Date.now().toString(),
        timestamp: new Date().toISOString(),
        source: 'FAQ',
        category: matchedFaqCategory.category
      });
    }

    // === 第二步：检查是否是型号查询 ===
    const modelPattern = /^[A-Z0-9-]+$/i;
    const possibleModel = message.trim().toUpperCase();
    
    if (modelPattern.test(possibleModel) && possibleModel.length > 3) {
      console.log('🔍 检测到型号查询:', possibleModel);
      
      try {
        const modelResponse = await fetch('https://cyberhome-faq-api-production.up.railway.app/api/product/model/' + possibleModel, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (modelResponse.ok) {
          const modelData = await modelResponse.json();
          
          if (modelData.success && modelData.product) {
            const formattedReply = formatProductDetail(
              modelData.product, 
              modelData.descriptions || [], 
              userLanguage
            );
            
            return res.status(200).json({
              response: formattedReply,
              fromFaq: true,
              sessionId: sessionId || Date.now().toString(),
              timestamp: new Date().toISOString(),
              source: 'knowledge_base',
              type: 'model_detail'
            });
          }
        }
      } catch (modelError) {
        console.error('型号查询失败:', modelError.message);
      }
    }

    // === 第三步：产品搜索（只有明确是产品查询时才进行）===
    const isProductQuery = 
      lowerMsg.includes('product') || 
      lowerMsg.includes('buy') || 
      lowerMsg.includes('price') ||
      lowerMsg.includes('air fryer') ||
      lowerMsg.includes('空气炸锅') ||
      lowerMsg.includes('规格') ||
      lowerMsg.includes('多少钱') ||
      lowerMsg.includes('推荐') ||
      lowerMsg.includes('哪个好') ||
      lowerMsg.includes('blender') ||
      lowerMsg.includes('kettle') ||
      lowerMsg.includes('humidifier') ||
      lowerMsg.includes('juicer');

    if (isProductQuery) {
      try {
        console.log('🔍 正在查询产品...');
        
        const productResponse = await fetch('https://cyberhome-faq-api-production.up.railway.app/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message, 
            type: 'product' 
          })
        });

        const productData = await productResponse.json();
        console.log('📊 产品搜索结果:', {
          success: productData.success,
          productCount: productData.productMatches?.length || 0
        });

        if (productData.success && productData.productMatches && productData.productMatches.length > 0) {
          const formattedReply = formatProductList(productData.productMatches, message, userLanguage);
          
          return res.status(200).json({
            response: formattedReply,
            fromFaq: true,
            sessionId: sessionId || Date.now().toString(),
            timestamp: new Date().toISOString(),
            source: 'knowledge_base',
            type: 'product_list',
            details: {
              productCount: productData.productMatches.length
            }
          });
        }
      } catch (productError) {
        console.error('产品查询失败:', productError.message);
      }
    }

    // === 第四步：调用 OpenAI ===
    console.log('🤖 调用OpenAI...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = userLanguage === 'zh' 
      ? `你是CYBERHOME（${STORE_URL}）的专业电子产品导购助手，请用中文回答。
我们的产品包括：空气炸锅、婴儿辅食机、奶瓶消毒器、温奶器、榨汁机、电水壶等。
你的职责：
1. 根据用户需求推荐合适的产品
2. 对比不同产品的优缺点
3. 解答产品使用问题
4. 提供优惠信息和促销组合

注意事项：
1. 如果用户询问"关于我们"、"联系方式"、"电压认证"等问题，请告知："这些信息请在网站底部查看"
2. 保持友好、专业、简洁的回答风格
3. 不要编造产品参数，不知道就说不知道
4. 当前促销：新用户首单享9折，满$100免运费`
      : `You are CYBERHOME's (${STORE_URL}) professional electronics shopping assistant. Please respond in English.
Our products include: air fryers, baby food makers, bottle sterilizers, bottle warmers, juicers, electric kettles, etc.
Your responsibilities:
1. Recommend suitable products based on user needs
2. Compare different products
3. Answer product usage questions
4. Provide promotion information

Notes:
1. If users ask about "about us", "contact", "voltage certification", etc., tell them: "Please check the website footer for this information"
2. Keep responses friendly, professional, and concise
3. Don't invent product specifications
4. Current promotion: 10% off for new users, free shipping over $100`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content;

    res.status(200).json({
      response: aiResponse,
      fromFaq: false,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      model: 'gpt-3.5-turbo',
      source: 'openai'
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    res.status(500).json({
      response: '抱歉，AI服务暂时不可用，请稍后再试。',
      sessionId: req.body.sessionId || Date.now().toString(),
      error: true,
      timestamp: new Date().toISOString()
    });
  }
}
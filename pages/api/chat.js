// pages/api/chat.js - 集成知识库统一搜索API（支持图片和按钮）
import OpenAI from 'openai';

// 店铺域名
const STORE_URL = 'https://www.cyberhome.app';

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
      
      // 卡片样式容器
      reply += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white;">\n`;
      
      // 图片和标题行
      reply += `<div style="display: flex; align-items: center; margin-bottom: 10px;">\n`;
      
      // 产品图片
      if (p.image_url) {
        const imageUrl = p.image_url.startsWith('http') ? p.image_url : `https:${p.image_url}`;
        reply += `<img src="${imageUrl}" width="60" height="60" style="border-radius: 8px; margin-right: 15px; object-fit: cover;" />\n`;
      }
      
      // 标题和价格
      reply += `<div style="flex: 1;">\n`;
      reply += `<strong style="font-size: 16px;">${index + 1}. ${p.title}</strong>\n`;
      if (p.price) reply += `<br/><span style="color: #f97316; font-weight: bold;">💰 $${p.price}</span>\n`;
      reply += `</div>\n`;
      reply += `</div>\n`; // 结束图片和标题行
      
      // 简短描述
      let cleanDesc = p.description_short
        ?.replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .substring(0, 120) || '';
      if (cleanDesc) reply += `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${cleanDesc}...</p>\n`;
      
      // 按钮组
      reply += `<div style="display: flex; gap: 10px; margin-top: 10px;">\n`;
      reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">🔗 查看详情</a>\n`;
      reply += `<span style="display: inline-block; padding: 8px 16px; background-color: #f3f4f6; color: #374151; border-radius: 6px; font-size: 14px;">📦 型号: ${p.product_id}</span>\n`;
      reply += `</div>\n`;
      
      reply += `</div>\n\n`; // 结束卡片
    });
    
    reply += `<p style="margin-top: 10px; color: #6b7280; font-style: italic;">💡 点击"查看详情"按钮查看完整信息，或回复型号获取更多参数。</p>`;
    
  } else {
    // 英文版
    reply = `I found these products for you:\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      const productUrl = p.handle 
        ? `${STORE_URL}/products/${p.handle}`
        : `${STORE_URL}/search?q=${p.product_id}`;
      
      reply += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white;">\n`;
      
      reply += `<div style="display: flex; align-items: center; margin-bottom: 10px;">\n`;
      
      if (p.image_url) {
        const imageUrl = p.image_url.startsWith('http') ? p.image_url : `https:${p.image_url}`;
        reply += `<img src="${imageUrl}" width="60" height="60" style="border-radius: 8px; margin-right: 15px; object-fit: cover;" />\n`;
      }
      
      reply += `<div style="flex: 1;">\n`;
      reply += `<strong style="font-size: 16px;">${index + 1}. ${p.title}</strong>\n`;
      if (p.price) reply += `<br/><span style="color: #f97316; font-weight: bold;">💰 $${p.price}</span>\n`;
      reply += `</div>\n`;
      reply += `</div>\n`;
      
      let cleanDesc = p.description_short
        ?.replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .substring(0, 120) || '';
      if (cleanDesc) reply += `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${cleanDesc}...</p>\n`;
      
      reply += `<div style="display: flex; gap: 10px; margin-top: 10px;">\n`;
      reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">🔗 View Details</a>\n`;
      reply += `<span style="display: inline-block; padding: 8px 16px; background-color: #f3f4f6; color: #374151; border-radius: 6px; font-size: 14px;">📦 Model: ${p.product_id}</span>\n`;
      reply += `</div>\n`;
      
      reply += `</div>\n\n`;
    });
    
    reply += `<p style="margin-top: 10px; color: #6b7280; font-style: italic;">💡 Click "View Details" button for more info, or reply with model number.</p>`;
  }
  
  return reply;
}

// 格式化产品详情回复（带图片和按钮）
function formatProductDetail(product, descriptions, language) {
  let reply = '';
  
  if (language === 'zh') {
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/search?q=${product.product_id}`;
    
    // 主卡片
    reply += `<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: white;">\n`;
    
    // 主图
    if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') ? product.image_url : `https:${product.image_url}`;
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="200" height="200" style="border-radius: 12px; max-width: 100%; object-fit: contain;" />\n`;
      reply += `</div>\n`;
    }
    
    // 标题
    reply += `<h2 style="margin: 0 0 10px 0; font-size: 20px;">${product.title}</h2>\n`;
    
    // 产品信息表格
    reply += `<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 型号</td><td style="padding: 8px;">${product.product_id}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">💰 价格</td><td style="padding: 8px; color: #f97316; font-weight: bold;">$${product.price}</td></tr>\n`;
    reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">🏷️ 品牌</td><td style="padding: 8px;">${product.vendor || 'Bear'}</td></tr>\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ 有货' : '⚠️ 需查询';
      reply += `<tr><td style="padding: 8px; background-color: #f9fafb; font-weight: bold;">📦 库存</td><td style="padding: 8px;">${stockText}</td></tr>\n`;
    }
    reply += `</table>\n`;
    
    // 产品描述
    if (product.description_short) {
      let cleanDesc = product.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">📝 产品描述</h3>\n`;
      reply += `<p style="color: #4b5563;">${cleanDesc}</p>\n`;
      reply += `</div>\n`;
    }
    
    // 详细功能
    if (descriptions && descriptions.length > 0) {
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">✨ 主要功能</h3>\n`;
      reply += `<ul style="color: #4b5563; padding-left: 20px;">\n`;
      let featureCount = 0;
      descriptions.forEach(desc => {
        if (featureCount >= 5) return;
        let cleanText = desc.chunk_text
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        if (cleanText.length > 20 && !cleanText.includes('http') && !cleanText.includes('https')) {
          cleanText = cleanText.replace(/^[•●\-]\s*/, '');
          reply += `<li>${cleanText}</li>\n`;
          featureCount++;
        }
      });
      reply += `</ul>\n`;
      reply += `</div>\n`;
    }
    
    // 按钮
    reply += `<div style="margin-top: 20px; text-align: center;">\n`;
    reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">🛒 查看商品页</a>\n`;
    reply += `</div>\n`;
    
    reply += `</div>\n`; // 结束主卡片
    
  } else {
    // 英文版
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/search?q=${product.product_id}`;
    
    reply += `<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: white;">\n`;
    
    if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') ? product.image_url : `https:${product.image_url}`;
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="200" height="200" style="border-radius: 12px; max-width: 100%; object-fit: contain;" />\n`;
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
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">📝 Description</h3>\n`;
      reply += `<p style="color: #4b5563;">${cleanDesc}</p>\n`;
      reply += `</div>\n`;
    }
    
    if (descriptions && descriptions.length > 0) {
      reply += `<div style="margin: 15px 0;">\n`;
      reply += `<h3 style="margin: 0 0 8px 0; font-size: 16px;">✨ Key Features</h3>\n`;
      reply += `<ul style="color: #4b5563; padding-left: 20px;">\n`;
      let featureCount = 0;
      descriptions.forEach(desc => {
        if (featureCount >= 5) return;
        let cleanText = desc.chunk_text
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        if (cleanText.length > 20 && !cleanText.includes('http') && !cleanText.includes('https')) {
          cleanText = cleanText.replace(/^[•●\-]\s*/, '');
          reply += `<li>${cleanText}</li>\n`;
          featureCount++;
        }
      });
      reply += `</ul>\n`;
      reply += `</div>\n`;
    }
    
    reply += `<div style="margin-top: 20px; text-align: center;">\n`;
    reply += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 16px;">🛒 View Product</a>\n`;
    reply += `</div>\n`;
    
    reply += `</div>\n`;
  }
  
  return reply;
}

// 格式化知识库回复（主函数）
function formatKnowledgeReply(data, userQuery) {
  const language = detectLanguage(userQuery);
  const { faq = [], products = [] } = data.results || {};
  
  // 优先显示产品
  if (products && products.length > 0) {
    return formatProductList(products, userQuery, language);
  }
  
  // 显示FAQ
  if (faq && faq.length > 0) {
    if (language === 'zh') {
      let reply = `📚 **常见问题解答**：\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `<div style="margin-bottom: 15px; padding: 10px; background-color: #f9fafb; border-radius: 8px;">\n`;
        reply += `<strong>Q${index + 1}: ${f.question}</strong>\n`;
        reply += `<p style="margin: 8px 0 0 0; color: #4b5563;">${f.answer}</p>\n`;
        reply += `</div>\n`;
      });
      return reply;
    } else {
      let reply = `📚 **Frequently Asked Questions**:\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `<div style="margin-bottom: 15px; padding: 10px; background-color: #f9fafb; border-radius: 8px;">\n`;
        reply += `<strong>Q${index + 1}: ${f.question}</strong>\n`;
        reply += `<p style="margin: 8px 0 0 0; color: #4b5563;">${f.answer}</p>\n`;
        reply += `</div>\n`;
      });
      return reply;
    }
  }
  
  return '';
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

    // === 检查是否是型号查询 ===
    const modelPattern = /^[A-Z0-9-]+$/i;
    const possibleModel = message.trim().toUpperCase();
    
    if (modelPattern.test(possibleModel) && possibleModel.length > 5) {
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

    // === 调用统一搜索 API ===
    try {
      console.log('🔍 正在查询知识库...');
      
      const knowledgeResponse = await fetch('https://cyberhome-faq-api-production.up.railway.app/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'all' })
      });

      const knowledgeData = await knowledgeResponse.json();
      console.log('📊 知识库返回:', {
        success: knowledgeData.success,
        hasResults: knowledgeData.hasResults,
        faqCount: knowledgeData.faqMatches?.length || 0,
        productCount: knowledgeData.productMatches?.length || 0
      });

      if (knowledgeData.success && knowledgeData.hasResults) {
        const formattedData = {
          results: {
            faq: knowledgeData.faqMatches || [],
            products: knowledgeData.productMatches || []
          }
        };
        
        const formattedReply = formatKnowledgeReply(formattedData, message);
        
        if (formattedReply) {
          console.log('✅ 使用知识库回复');
          return res.status(200).json({
            response: formattedReply,
            fromFaq: true,
            sessionId: sessionId || Date.now().toString(),
            timestamp: new Date().toISOString(),
            source: 'knowledge_base',
            details: {
              faqCount: knowledgeData.faqMatches?.length || 0,
              productCount: knowledgeData.productMatches?.length || 0
            }
          });
        }
      }
      
      console.log('⏭️ 知识库无匹配，调用OpenAI');
      
    } catch (knowledgeError) {
      console.error('⚠️ 知识库查询失败:', knowledgeError.message);
    }

    // === 调用 OpenAI ===
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
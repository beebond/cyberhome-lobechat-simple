// pages/api/chat.js - 集成知识库统一搜索API（支持图片和链接）
import OpenAI from 'openai';

// 店铺域名
const STORE_URL = 'https://www.cyberhome.app';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 格式化产品列表回复（带图片和链接）
function formatProductList(products, userQuery, language) {
  let reply = '';
  
  if (language === 'zh') {
    reply = `我为您找到以下产品：\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      // 产品图片（缩小尺寸显示）
      if (p.image_url) {
        // 尝试获取高清图，如果失败就用原图
        const imageUrl = p.image_url.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_300x300.$1');
        reply += `<img src="${imageUrl}" width="80" height="80" style="border-radius: 8px; margin-right: 10px;" />\n`;
      }
      
      // 产品标题和链接
      const productUrl = `${STORE_URL}/products/${p.handle}`;
      reply += `### [${index + 1}. ${p.title}](${productUrl})\n`;
      
      // 价格
      if (p.price) reply += `💰 **价格：$${p.price}**\n`;
      
      // 简短描述
      if (p.description_short) {
        const desc = p.description_short.replace(/<[^>]*>/g, '').substring(0, 120);
        reply += `📝 ${desc}...\n`;
      }
      
      // 型号提示
      reply += `🔗 [查看详情](${productUrl}) | 📦 型号：\`${p.product_id}\`\n\n`;
    });
    
    reply += `💡 **回复型号**（如 \`${products[0]?.product_id}\`）查看完整参数和图片，或告诉我您关心的具体功能。`;
    
  } else {
    reply = `I found these products for you:\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      if (p.image_url) {
        const imageUrl = p.image_url.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_300x300.$1');
        reply += `<img src="${imageUrl}" width="80" height="80" style="border-radius: 8px; margin-right: 10px;" />\n`;
      }
      
      const productUrl = `${STORE_URL}/products/${p.handle}`;
      reply += `### [${index + 1}. ${p.title}](${productUrl})\n`;
      
      if (p.price) reply += `💰 **Price: $${p.price}**\n`;
      
      if (p.description_short) {
        const desc = p.description_short.replace(/<[^>]*>/g, '').substring(0, 120);
        reply += `📝 ${desc}...\n`;
      }
      
      reply += `🔗 [View Details](${productUrl}) | 📦 Model: \`${p.product_id}\`\n\n`;
    });
    
    reply += `💡 **Reply with model number** (e.g., \`${products[0]?.product_id}\`) for full specs and images.`;
  }
  
  return reply;
}

// 格式化产品详情回复（带图片和链接）
function formatProductDetail(product, descriptions, language) {
  let reply = '';
  
  if (language === 'zh') {
    // 主图
    if (product.image_url) {
      const mainImage = product.image_url.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_600x600.$1');
      reply += `<img src="${mainImage}" width="300" height="300" style="border-radius: 12px; margin-bottom: 15px;" />\n\n`;
    }
    
    const productUrl = `${STORE_URL}/products/${product.handle}`;
    reply += `## [${product.title}](${productUrl})\n\n`;
    
    // 产品信息表格
    reply += `| 属性 | 信息 |\n`;
    reply += `|------|------|\n`;
    reply += `| 📦 **型号** | \`${product.product_id}\` |\n`;
    reply += `| 💰 **价格** | **$${product.price}** |\n`;
    reply += `| 🏷️ **品牌** | ${product.vendor} |\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ 有货' : '⚠️ 需查询';
      reply += `| 📦 **库存** | ${stockText} |\n`;
    }
    reply += `\n`;
    
    // 简短描述
    if (product.description_short) {
      const cleanDesc = product.description_short.replace(/<[^>]*>/g, '');
      reply += `### 📝 产品描述\n${cleanDesc}\n\n`;
    }
    
    // 详细功能（从描述片段中提取）
    if (descriptions && descriptions.length > 0) {
      reply += `### ✨ 主要功能\n`;
      descriptions.slice(0, 5).forEach((desc, i) => {
        const cleanText = desc.chunk_text.replace(/<[^>]*>/g, '').trim();
        if (cleanText.length > 20) {
          reply += `- ${cleanText}\n`;
        }
      });
      reply += '\n';
    }
    
    // 多张图片（如果有）
    const productImages = descriptions
      .filter(d => d.image_url && d.image_url !== product.image_url)
      .map(d => d.image_url)
      .slice(0, 3);
    
    if (productImages.length > 0) {
      reply += `### 🖼️ 产品图片\n`;
      productImages.forEach(imgUrl => {
        const thumbUrl = imgUrl.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_100x100.$1');
        reply += `<img src="${thumbUrl}" width="80" height="80" style="border-radius: 6px; margin-right: 8px;" /> `;
      });
      reply += '\n\n';
    }
    
    // 购买按钮和链接
    reply += `🔗 [**👉 查看商品页**](${productUrl})\n\n`;
    
    // 后续问题建议
    reply += `💡 **还想了解什么？** 例如：\n`;
    reply += `- 容量和尺寸\n`;
    reply += `- 是否支持自动清洗\n`;
    reply += `- 和同系列其他产品的区别\n`;
    reply += `- 用户评价如何`;
    
  } else {
    // 英文版
    if (product.image_url) {
      const mainImage = product.image_url.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_600x600.$1');
      reply += `<img src="${mainImage}" width="300" height="300" style="border-radius: 12px; margin-bottom: 15px;" />\n\n`;
    }
    
    const productUrl = `${STORE_URL}/products/${product.handle}`;
    reply += `## [${product.title}](${productUrl})\n\n`;
    
    reply += `| Attribute | Info |\n`;
    reply += `|------|------|\n`;
    reply += `| 📦 **Model** | \`${product.product_id}\` |\n`;
    reply += `| 💰 **Price** | **$${product.price}** |\n`;
    reply += `| 🏷️ **Brand** | ${product.vendor} |\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ In Stock' : '⚠️ Check Availability';
      reply += `| 📦 **Stock** | ${stockText} |\n`;
    }
    reply += `\n`;
    
    if (product.description_short) {
      const cleanDesc = product.description_short.replace(/<[^>]*>/g, '');
      reply += `### 📝 Description\n${cleanDesc}\n\n`;
    }
    
    if (descriptions && descriptions.length > 0) {
      reply += `### ✨ Key Features\n`;
      descriptions.slice(0, 5).forEach((desc, i) => {
        const cleanText = desc.chunk_text.replace(/<[^>]*>/g, '').trim();
        if (cleanText.length > 20) {
          reply += `- ${cleanText}\n`;
        }
      });
      reply += '\n';
    }
    
    const productImages = descriptions
      .filter(d => d.image_url && d.image_url !== product.image_url)
      .map(d => d.image_url)
      .slice(0, 3);
    
    if (productImages.length > 0) {
      reply += `### 🖼️ Gallery\n`;
      productImages.forEach(imgUrl => {
        const thumbUrl = imgUrl.replace(/\.(jpg|jpeg|png|gif|webp)/i, '_100x100.$1');
        reply += `<img src="${thumbUrl}" width="80" height="80" style="border-radius: 6px; margin-right: 8px;" /> `;
      });
      reply += '\n\n';
    }
    
    reply += `🔗 [**👉 View Product Page**](${productUrl})\n\n`;
    
    reply += `💡 **What else?** Ask me about:\n`;
    reply += `- Capacity & dimensions\n`;
    reply += `- Self-clean function\n`;
    reply += `- Compare with other models\n`;
    reply += `- Customer reviews`;
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
        reply += `**Q${index + 1}: ${f.question}**\n`;
        reply += `${f.answer}\n\n`;
      });
      return reply;
    } else {
      let reply = `📚 **Frequently Asked Questions**:\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `**Q${index + 1}: ${f.question}**\n`;
        reply += `${f.answer}\n\n`;
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
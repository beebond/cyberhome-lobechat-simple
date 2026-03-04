// pages/api/chat.js - 集成知识库统一搜索API（支持图片和链接，修复版）
import OpenAI from 'openai';

// 店铺域名
const STORE_URL = 'https://www.cyberhome.app';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 格式化产品列表回复（带图片和链接，修复版）
function formatProductList(products, userQuery, language) {
  let reply = '';
  
  if (language === 'zh') {
    reply = `我为您找到以下产品：\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      // 使用HTML img标签显示图片
      if (p.image_url) {
        // 确保图片URL是完整的
        const imageUrl = p.image_url.startsWith('http') ? p.image_url : `https:${p.image_url}`;
        reply += `<div style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">\n`;
        reply += `<img src="${imageUrl}" width="70" height="70" style="border-radius: 8px; margin-right: 15px; object-fit: cover;" />\n`;
        reply += `<div style="flex: 1;">\n`;
      } else {
        reply += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">\n`;
      }
      
      // 构建产品链接 - 使用handle
      const productUrl = p.handle 
        ? `${STORE_URL}/products/${p.handle}`
        : `${STORE_URL}/products?model=${p.product_id}`;
      
      // 产品标题和链接
      reply += `### ${index + 1}. [${p.title}](${productUrl})\n`;
      
      // 价格
      if (p.price) reply += `💰 **价格: $${p.price}**  \n`;
      
      // 清理描述中的HTML标签
      let cleanDesc = '';
      if (p.description_short) {
        cleanDesc = p.description_short
          .replace(/<[^>]*>/g, '')  // 移除HTML标签
          .replace(/&amp;/g, '&')    // 修复&amp;
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .substring(0, 150);
      }
      if (cleanDesc) {
        reply += `${cleanDesc}...  \n`;
      }
      
      // 操作链接
      reply += `🔗 [查看详情](${productUrl}) | 📦 型号: \`${p.product_id}\`\n`;
      reply += `</div></div>\n\n`;
    });
    
    reply += `\n💡 **回复型号**（如 \`${products[0]?.product_id}\`）查看完整参数和图片。`;
    
  } else {
    // 英文版
    reply = `I found these products for you:\n\n`;
    
    products.slice(0, 3).forEach((p, index) => {
      if (p.image_url) {
        const imageUrl = p.image_url.startsWith('http') ? p.image_url : `https:${p.image_url}`;
        reply += `<div style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">\n`;
        reply += `<img src="${imageUrl}" width="70" height="70" style="border-radius: 8px; margin-right: 15px; object-fit: cover;" />\n`;
        reply += `<div style="flex: 1;">\n`;
      } else {
        reply += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">\n`;
      }
      
      const productUrl = p.handle 
        ? `${STORE_URL}/products/${p.handle}`
        : `${STORE_URL}/products?model=${p.product_id}`;
      
      reply += `### ${index + 1}. [${p.title}](${productUrl})\n`;
      
      if (p.price) reply += `💰 **Price: $${p.price}**  \n`;
      
      let cleanDesc = '';
      if (p.description_short) {
        cleanDesc = p.description_short
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .substring(0, 150);
      }
      if (cleanDesc) {
        reply += `${cleanDesc}...  \n`;
      }
      
      reply += `🔗 [View Details](${productUrl}) | 📦 Model: \`${p.product_id}\`\n`;
      reply += `</div></div>\n\n`;
    });
    
    reply += `\n💡 **Reply with model number** (e.g., \`${products[0]?.product_id}\`) for full specs and images.`;
  }
  
  return reply;
}

// 格式化产品详情回复（带图片和链接，修复版）
function formatProductDetail(product, descriptions, language) {
  let reply = '';
  
  if (language === 'zh') {
    // 主图
    if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') ? product.image_url : `https:${product.image_url}`;
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="300" height="300" style="border-radius: 12px; max-width: 100%; object-fit: contain;" />\n`;
      reply += `</div>\n\n`;
    }
    
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/products?model=${product.product_id}`;
    
    reply += `## [${product.title}](${productUrl})\n\n`;
    
    // 产品信息表格
    reply += `| 属性 | 信息 |\n`;
    reply += `|------|------|\n`;
    reply += `| 📦 **型号** | \`${product.product_id}\` |\n`;
    reply += `| 💰 **价格** | **$${product.price}** |\n`;
    reply += `| 🏷️ **品牌** | ${product.vendor || 'Bear'} |\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ 有货' : '⚠️ 需查询';
      reply += `| 📦 **库存** | ${stockText} |\n`;
    }
    reply += `\n`;
    
    // 简短描述
    if (product.description_short) {
      let cleanDesc = product.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      reply += `### 📝 产品描述\n${cleanDesc}\n\n`;
    }
    
    // 详细功能（从描述片段中提取）
    if (descriptions && descriptions.length > 0) {
      reply += `### ✨ 主要功能\n`;
      let featureCount = 0;
      descriptions.forEach(desc => {
        if (featureCount >= 5) return;
        let cleanText = desc.chunk_text
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        // 过滤掉太短的和包含URL的文本
        if (cleanText.length > 20 && !cleanText.includes('http') && !cleanText.includes('https')) {
          // 移除列表标记
          cleanText = cleanText.replace(/^[•●\-]\s*/, '');
          reply += `- ${cleanText}\n`;
          featureCount++;
        }
      });
      reply += '\n';
    }
    
    // 购买按钮
    reply += `---\n`;
    reply += `👉 **[点击查看商品页](${productUrl})** 获取更多信息\n\n`;
    
    // 后续问题建议
    reply += `💡 **还想了解什么？** 例如：\n`;
    reply += `- 容量和尺寸\n`;
    reply += `- 是否支持自动清洗\n`;
    reply += `- 和同系列其他产品的区别\n`;
    reply += `- 用户评价如何\n`;
    
  } else {
    // 英文版
    if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') ? product.image_url : `https:${product.image_url}`;
      reply += `<div style="text-align: center; margin-bottom: 20px;">\n`;
      reply += `<img src="${imageUrl}" width="300" height="300" style="border-radius: 12px; max-width: 100%; object-fit: contain;" />\n`;
      reply += `</div>\n\n`;
    }
    
    const productUrl = product.handle 
      ? `${STORE_URL}/products/${product.handle}`
      : `${STORE_URL}/products?model=${product.product_id}`;
    
    reply += `## [${product.title}](${productUrl})\n\n`;
    
    reply += `| Attribute | Info |\n`;
    reply += `|------|------|\n`;
    reply += `| 📦 **Model** | \`${product.product_id}\` |\n`;
    reply += `| 💰 **Price** | **$${product.price}** |\n`;
    reply += `| 🏷️ **Brand** | ${product.vendor || 'Bear'} |\n`;
    if (product.stock_status) {
      const stockText = product.stock_status === 'in_stock' ? '✅ In Stock' : '⚠️ Check Availability';
      reply += `| 📦 **Stock** | ${stockText} |\n`;
    }
    reply += `\n`;
    
    if (product.description_short) {
      let cleanDesc = product.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      reply += `### 📝 Description\n${cleanDesc}\n\n`;
    }
    
    if (descriptions && descriptions.length > 0) {
      reply += `### ✨ Key Features\n`;
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
          reply += `- ${cleanText}\n`;
          featureCount++;
        }
      });
      reply += '\n';
    }
    
    reply += `---\n`;
    reply += `👉 **[View Product Page](${productUrl})** for more info\n\n`;
    
    reply += `💡 **What else?** Ask me about:\n`;
    reply += `- Capacity & dimensions\n`;
    reply += `- Self-clean function\n`;
    reply += `- Compare with other models\n`;
    reply += `- Customer reviews\n`;
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
        reply += `**Q${index + 1}: ${f.question}**  \n`;
        reply += `${f.answer}\n\n`;
      });
      return reply;
    } else {
      let reply = `📚 **Frequently Asked Questions**:\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `**Q${index + 1}: ${f.question}**  \n`;
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
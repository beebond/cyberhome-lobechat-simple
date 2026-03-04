// pages/api/chat.js - 集成知识库统一搜索API
import OpenAI from 'openai';

// 检测语言函数
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

// 格式化知识库回复
function formatKnowledgeReply(data, userQuery) {
  const language = detectLanguage(userQuery);
  const { faq = [], products = [] } = data.results || {};
  
  let reply = '';
  
  // 1. 如果有产品（优先显示产品）
  if (products && products.length > 0) {
    if (language === 'zh') {
      reply += `我为您找到以下相关产品：\n\n`;
      products.forEach((p, index) => {
        reply += `${index + 1}. **${p.title}**`;
        if (p.price) reply += ` - $${p.price}`;
        reply += `\n   ${p.description_short?.substring(0, 100)}...\n\n`;
      });
      
      // 如果用户询问型号
      if (userQuery.toLowerCase().includes('model') || userQuery.includes('型号')) {
        reply += `产品型号：\n`;
        products.forEach(p => {
          reply += `- ${p.product_id}\n`;
        });
      }
      
      reply += `\n💡 您对哪款产品感兴趣？我可以为您提供更多详细信息。`;
    } else {
      reply += `I found these products for you:\n\n`;
      products.forEach((p, index) => {
        reply += `${index + 1}. **${p.title}**`;
        if (p.price) reply += ` - $${p.price}`;
        reply += `\n   ${p.description_short?.substring(0, 100)}...\n\n`;
      });
      
      if (userQuery.toLowerCase().includes('model')) {
        reply += `Model numbers:\n`;
        products.forEach(p => {
          reply += `- ${p.product_id}\n`;
        });
      }
      
      reply += `\n💡 Which product interests you? I can provide more details.`;
    }
  }
  
  // 2. 如果没有产品，但有FAQ
  else if (faq && faq.length > 0) {
    if (language === 'zh') {
      reply += `📚 常见问题解答：\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `Q${index + 1}: ${f.question}\nA: ${f.answer}\n\n`;
      });
    } else {
      reply += `📚 Frequently Asked Questions:\n\n`;
      faq.slice(0, 2).forEach((f, index) => {
        reply += `Q${index + 1}: ${f.question}\nA: ${f.answer}\n\n`;
      });
    }
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

    // 检测用户语言
    const userLanguage = detectLanguage(message);
    console.log('🔤 用户语言:', userLanguage);
    console.log('🔍 用户问题:', message);

    // === 第一步：调用统一搜索 API（同时查FAQ和产品） ===
    try {
      console.log('🔍 正在查询知识库统一搜索API...');
      
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

      // 如果有结果，格式化返回
      if (knowledgeData.success && knowledgeData.hasResults) {
        // 我们的统一搜索API已经返回了友好的 reply
        if (knowledgeData.reply) {
          console.log('✅ 使用知识库回复');
          return res.status(200).json({
            response: knowledgeData.reply,
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
        
        // 如果没有 reply，自己格式化
        const formattedReply = formatKnowledgeReply(knowledgeData, message);
        if (formattedReply) {
          console.log('✅ 使用格式化的知识库回复');
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

    // === 第二步：没有知识库匹配，调用 OpenAI ===
    console.log('🤖 调用OpenAI...');

    // 诊断环境变量
    console.log('=== 环境变量诊断 ===');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ 存在' : '❌ 不存在');
    console.log('===================');

    // 初始化 OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 根据用户语言设置系统提示
    const systemPrompt = userLanguage === 'zh' 
      ? `你是CYBERHOME的专业电子产品导购助手，请用中文回答。
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
      : `You are CYBERHOME's professional electronics shopping assistant. Please respond in English.
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

    // 调用 OpenAI API
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

    // 返回 OpenAI 响应
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
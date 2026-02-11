// pages/api/chat.js - OpenAI 集成版本（已集成FAQ知识库）
import OpenAI from 'openai';

export default async function handler(req, res) {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;

    // 验证输入
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // === 第一步：先查 FAQ 知识库（使用公网域名）===
    try {
      console.log('🔍 正在查询FAQ知识库...');
      
      const faqResponse = await fetch('https://cyberhome-faq-api-production.up.railway.app/api/faq/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const faqData = await faqResponse.json();
      console.log('📚 FAQ查询结果:', {
        hasExactMatch: faqData.hasExactMatch,
        resultCount: faqData.totalResults
      });

      // 如果有高置信度的匹配答案（score > 15）
      if (faqData.hasExactMatch && faqData.suggestedAnswer) {
        console.log('✅ 命中FAQ知识库，直接返回答案');
        return res.status(200).json({
          response: faqData.suggestedAnswer,
          fromFaq: true,
          sessionId: sessionId || Date.now().toString(),
          timestamp: new Date().toISOString(),
          source: 'knowledge_base'
        });
      }
    } catch (faqError) {
      // FAQ 服务不可用时不中断流程，继续调用 OpenAI
      console.error('⚠️ FAQ 知识库查询失败:', faqError.message);
    }

    // === 第二步：没有FAQ匹配，调用 OpenAI ===
    console.log('🤖 未匹配FAQ，调用OpenAI...');

    // 诊断环境变量
    console.log('=== 开始环境变量诊断 ===');
    console.log('1. 当前时间:', new Date().toISOString());
    console.log('2. NODE_ENV:', process.env.NODE_ENV);
    console.log('3. OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '存在（已隐藏值）' : '不存在');
    console.log('=== 诊断结束 ===');

    // 初始化 OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 系统提示词
    const systemPrompt = `你是CYBERHOME的专业电子产品导购助手，请用中文回答。
你的职责：
1. 根据用户需求推荐合适的产品
2. 对比不同产品的优缺点
3. 解答产品使用问题
4. 提供优惠信息和促销组合

注意事项：
1. 如果用户询问"关于我们"、"联系方式"、"电压认证"等问题，请告知："这些信息请在网站底部查看"
2. 保持友好、专业、简洁的回答风格
3. 不要编造产品参数，不知道就说不知道
4. 当前促销：新用户首单享9折，满$100免运费`;

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
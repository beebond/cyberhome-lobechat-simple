// pages/api/chat.js - OpenAI 集成版本
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

    // === 诊断环境变量 ===
    console.log('=== 开始环境变量诊断 ===');
    console.log('1. 当前时间:', new Date().toISOString());
    console.log('2. NODE_ENV:', process.env.NODE_ENV);
    console.log('3. 直接读取 OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '存在（已隐藏值）' : '不存在');
    console.log('4. OPENAI_API_KEY 长度:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    console.log('5. 前5位字符:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : '空');
    console.log('6. 所有包含 "OPENAI" 的变量:', Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', '));
    console.log('7. Railway 系统变量 RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN || '未找到');
    console.log('8. Railway 系统变量 RAILWAY_SERVICE_NAME:', process.env.RAILWAY_SERVICE_NAME || '未找到');
    console.log('9. 当前目录文件（前5个）:', require('fs').readdirSync('.').slice(0, 5).join(', '));
    console.log('=== 诊断结束 ===');
    
    // 诊断：检查是否是 Railway 环境变量注入问题
    const testApiKey = process.env.OPENAI_API_KEY;
    if (!testApiKey || testApiKey.trim() === '') {
      console.error('❌ 错误：OPENAI_API_KEY 为空或未定义');
      console.error('   所有可用的环境变量键:', Object.keys(process.env).sort().join(', '));
    }

    // 初始化 OpenAI（从环境变量读取 API Key）
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // 如果使用 Azure OpenAI 或其他兼容API，取消下面注释：
      // baseURL: process.env.OPENAI_BASE_URL,
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

    // 返回响应
    res.status(200).json({
      response: aiResponse,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      model: 'gpt-3.5-turbo',
    });

  } catch (error) {
    console.error('❌ OpenAI API 错误:', error.message);
    console.error('🔍 完整错误堆栈:', error.stack);
    console.error('📋 错误详情:', {
      name: error.name,
      code: error.code,
      status: error.status,
      headers: error.headers
    });
    
    // 返回降级响应
    res.status(500).json({
      response: '抱歉，AI服务暂时不可用，请稍后再试。',
      sessionId: req.body.sessionId || Date.now().toString(),
      error: true,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
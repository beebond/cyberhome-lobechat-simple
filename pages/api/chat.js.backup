// pages/api/chat.js - 简单测试 API
export default function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    
    // 模拟 AI 回复
    const response = `我收到了你的测试消息："${message}"。这是一个测试回复。`;
    
    // 模拟延迟
    setTimeout(() => {
      res.status(200).json({
        content: response,
        role: 'assistant',
        timestamp: new Date().toISOString()
      });
    }, 1000);
  } else {
    res.status(200).json({ 
      status: 'API 运行正常',
      message: '发送 POST 请求进行聊天测试'
    });
  }
}
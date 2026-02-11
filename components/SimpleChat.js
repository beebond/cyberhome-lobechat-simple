// components/SimpleChat.js - 完整修复版（已集成FAQ知识库）
import { useState, useRef, useEffect } from 'react';

export default function SimpleChat() {
  const [messages, setMessages] = useState(['欢迎使用 CyberHome AI 聊天']);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = `你: ${input}`;
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      console.log('🔍 正在查询FAQ知识库...');
      
      // ========= 第一步：先查 FAQ 知识库 =========
      const faqResponse = await fetch('https://cyberhome-faq-api-production.up.railway.app/api/faq/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
        }),
      });

      const faqData = await faqResponse.json();
      console.log('FAQ查询结果:', faqData);

      // 如果有高置信度的匹配答案
      if (faqData.hasExactMatch && faqData.suggestedAnswer) {
        setMessages([...newMessages, `📚 AI: ${faqData.suggestedAnswer}`]);
        setLoading(false);
        return;  // 直接返回，不再调用 OpenAI
      }

      // ========= 第二步：没有FAQ匹配，调用原有的 /api/chat =========
      console.log('❌ 未找到FAQ匹配，调用OpenAI...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId: Date.now().toString(),
        }),
      });

      console.log('收到响应:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('响应数据:', data);
      
      if (data.error) {
        setMessages([...newMessages, `AI: ${data.response}`]);
      } else {
        setMessages([...newMessages, `AI: ${data.response}`]);
      }
      
    } catch (error) {
      console.error('API 调用错误:', error);
      setMessages([...newMessages, `AI: 抱歉，服务暂时不可用。错误: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: 16, 
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map((msg, i) => (
          <div 
            key={i} 
            style={{ 
              marginBottom: 12, 
              padding: '12px 16px', 
              borderRadius: '12px',
              maxWidth: '85%',
              alignSelf: msg.startsWith('你:') ? 'flex-end' : 'flex-start',
              background: msg.startsWith('你:') ? '#1890ff' : 
                         msg.includes('📚') ? '#e6f7e6' : 'white',
              color: msg.startsWith('你:') ? 'white' : 
                     msg.includes('📚') ? '#2c7a2c' : '#333',
              border: msg.includes('📚') ? '1px solid #95de64' : 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {msg}
          </div>
        ))}
        
        {loading && (
          <div style={{ 
            marginBottom: 12, 
            padding: '12px 16px', 
            background: 'white', 
            borderRadius: '12px',
            alignSelf: 'flex-start',
            color: '#666',
            fontStyle: 'italic'
          }}>
            AI: 正在思考中...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ 
        padding: '16px 20px', 
        borderTop: '1px solid #ddd',
        background: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入消息..."
            style={{ 
              flex: 1, 
              padding: '12px 16px', 
              marginRight: 12,
              border: '1px solid #ddd',
              borderRadius: '24px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border 0.3s',
              ':focus': {
                borderColor: '#1890ff'
              }
            }}
            disabled={loading}
          />
          <button 
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ 
              padding: '12px 24px', 
              background: loading ? '#ccc' : (input.trim() ? '#1890ff' : '#ccc'),
              color: 'white', 
              border: 'none',
              borderRadius: '24px',
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'background 0.3s'
            }}
          >
            {loading ? '发送中...' : '发送'}
          </button>
        </div>
        <div style={{ 
          marginTop: 8, 
          fontSize: '12px', 
          color: '#999',
          textAlign: 'center'
        }}>
          按 Enter 发送，Shift + Enter 换行 | 📚 绿色回答来自知识库
        </div>
      </div>
    </div>
  );
}
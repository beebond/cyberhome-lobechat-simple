// components/SimpleChat.js - 完整修复版（已集成FAQ知识库后端版）
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
      console.log('📤 发送消息:', input);
      
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

      console.log('📥 收到响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 响应数据:', data);
      
      // 根据来源显示不同样式
      if (data.fromFaq) {
        setMessages([...newMessages, `📚 AI: ${data.response}`]);
      } else {
        setMessages([...newMessages, `AI: ${data.response}`]);
      }
    } catch (error) {
      console.error('❌ API 调用错误:', error);
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
        {messages.map((msg, i) => {
          const isUser = msg.startsWith('你:');
          const isFaq = msg.includes('📚');
          
          return (
            <div 
              key={i} 
              style={{ 
                marginBottom: 12, 
                padding: '12px 16px', 
                borderRadius: '12px',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                background: isUser ? '#1890ff' : (isFaq ? '#e6f7e6' : 'white'),
                color: isUser ? 'white' : (isFaq ? '#2c7a2c' : '#333'),
                border: isFaq ? '1px solid #95de64' : 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                wordBreak: 'break-word'
              }}
            >
              {msg}
            </div>
          );
        })}
        
        {loading && (
          <div style={{ 
            marginBottom: 12, 
            padding: '12px 16px', 
            background: 'white', 
            borderRadius: '12px',
            alignSelf: 'flex-start',
            color: '#666',
            fontStyle: 'italic',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
              background: loading || !input.trim() ? '#ccc' : '#1890ff',
              color: 'white', 
              border: 'none',
              borderRadius: '24px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
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
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <span>按 Enter 发送，Shift + Enter 换行</span>
          <span style={{ color: '#52c41a' }}>📚 绿色回答来自知识库</span>
        </div>
      </div>
    </div>
  );
}
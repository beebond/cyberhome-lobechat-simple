// components/SimpleChat.js - 显示产品卡片
import { useState, useRef, useEffect } from 'react';

export default function SimpleChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      content: 'Welcome to CyberHome Support! How can we help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now().toString());
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response,
        timestamp: new Date(data.timestamp),
        metadata: { hasProducts: data.hasProducts }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('❌ API 调用错误:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, service temporarily unavailable. Please try again.',
        timestamp: new Date(),
        metadata: { error: true }
      }]);
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

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderHTML = (html) => {
    const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return { __html: sanitized };
  };

  const containsHTML = (text) => /<[a-z][\s\S]*>/i.test(text);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '12px 16px',
        background: '#1a1a1a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: '#1890ff',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 'bold'
        }}>
          C
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
          CyberHome Support
        </div>
      </div>

      {/* 消息区域 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((msg) => {
          const isUser = msg.type === 'user';
          const isHTML = containsHTML(msg.content);
          
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: isUser ? 'row-reverse' : 'row',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isUser ? '#1890ff' : '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: isUser ? 'white' : '#333',
                flexShrink: 0
              }}>
                {isUser ? '👤' : '🤖'}
              </div>

              <div style={{
                maxWidth: 'calc(100% - 36px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {!isUser && msg.metadata?.hasProducts && (
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginLeft: '4px',
                    marginBottom: '2px'
                  }}>
                    <span style={{ 
                      background: '#e6f7e6', 
                      color: '#2c7a2c', 
                      padding: '2px 6px', 
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}>
                      📦 Products Available
                    </span>
                  </div>
                )}

                <div style={{
                  padding: isHTML ? '0' : '10px 12px',
                  borderRadius: '12px',
                  background: isUser ? '#1890ff' : 'white',
                  color: isUser ? 'white' : '#333',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  borderTopLeftRadius: isUser ? '12px' : '4px',
                  borderTopRightRadius: isUser ? '4px' : '12px',
                  overflow: 'hidden'
                }}>
                  {isHTML ? (
                    <div dangerouslySetInnerHTML={renderHTML(msg.content)} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                </div>
                
                <div style={{
                  fontSize: '10px',
                  color: '#999',
                  textAlign: isUser ? 'right' : 'left',
                  padding: '0 4px'
                }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              🤖
            </div>
            <div style={{
              padding: '10px 12px',
              background: 'white',
              borderRadius: '12px',
              borderTopLeftRadius: '4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ animation: 'pulse 1s infinite' }}>.</span>
                <span style={{ animation: 'pulse 1s infinite 0.2s' }}>.</span>
                <span style={{ animation: 'pulse 1s infinite 0.4s' }}>.</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e0e0e0',
        background: 'white'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f5f5f5',
          borderRadius: '20px',
          padding: '4px 4px 4px 12px'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '8px 0',
              fontSize: '14px',
              outline: 'none'
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#ccc' : '#1890ff',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              color: 'white',
              fontSize: '16px'
            }}
          >
            ↑
          </button>
        </div>
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          color: '#999',
          textAlign: 'center'
        }}>
          Enter to send
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
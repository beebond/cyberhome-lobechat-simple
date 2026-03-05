// components/SimpleChat.js - 语言同步版
import { useState, useRef, useEffect } from 'react';

// 消息类型常量
const MESSAGE_TYPES = {
  USER: 'user',
  AI_EXTERNAL: 'ai_external',
  AI_FAQ: 'ai_faq',
  HUMAN: 'human'
};

// 角色头像配置
const AVATARS = {
  [MESSAGE_TYPES.AI_EXTERNAL]: {
    icon: '🤖',
    bgColor: '#f0f0f0',
    color: '#333',
    label: 'AI Assistant'
  },
  [MESSAGE_TYPES.AI_FAQ]: {
    icon: '📚',
    bgColor: '#e6f7e6',
    color: '#2c7a2c',
    label: 'Knowledge Base'
  },
  [MESSAGE_TYPES.HUMAN]: {
    icon: '👤',
    bgColor: '#1890ff',
    color: 'white',
    label: 'Support'
  }
};

export default function SimpleChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: MESSAGE_TYPES.HUMAN,
      content: 'Welcome to CyberHome Support! How can we help you today?',
      timestamp: new Date(),
      metadata: { source: 'Welcome Message' }
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now().toString());
  const [currentLanguage, setCurrentLanguage] = useState('en'); // 默认英文
  
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 检测语言
  const detectLanguage = (text) => {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text) ? 'zh' : 'en';
  };

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // 检测用户输入的语言
    const userLang = detectLanguage(input);
    setCurrentLanguage(userLang);

    const userMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.USER,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
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
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 根据来源确定消息类型
      let messageType = data.fromFaq ? MESSAGE_TYPES.AI_FAQ : MESSAGE_TYPES.AI_EXTERNAL;
      
      // 如果API返回了语言信息，更新当前语言
      if (data.language) {
        setCurrentLanguage(data.language);
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: messageType,
        content: data.response,
        timestamp: new Date(data.timestamp),
        metadata: { 
          source: data.source,
          hasProducts: data.hasProducts 
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('❌ API 调用错误:', error);
      
      // 错误信息也根据当前语言显示
      const errorMsg = currentLanguage === 'zh' 
        ? '抱歉，服务暂时不可用，请稍后再试。'
        : 'Sorry, service temporarily unavailable. Please try again.';
        
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.AI_EXTERNAL,
        content: errorMsg,
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

  // 安全渲染HTML
  const renderHTML = (html) => {
    const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return { __html: sanitized };
  };

  // 检查消息是否包含HTML
  const containsHTML = (text) => {
    return /<[a-z][\s\S]*>/i.test(text);
  };

  const getMessageLabel = (type) => {
    return AVATARS[type]?.label || 'AI';
  };

  // 根据当前语言获取占位符文本
  const getPlaceholder = () => {
    return currentLanguage === 'zh' ? '输入消息...' : 'Type your message...';
  };

  // 根据当前语言获取底部提示
  const getFooterText = () => {
    return currentLanguage === 'zh' ? '按 Enter 发送' : 'Enter to send';
  };

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
        {/* 显示当前语言 */}
        <div style={{
          fontSize: 11,
          background: '#333',
          padding: '2px 6px',
          borderRadius: 10,
          color: '#ccc'
        }}>
          {currentLanguage === 'zh' ? '中文' : 'EN'}
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
          const isUser = msg.type === MESSAGE_TYPES.USER;
          const avatar = AVATARS[msg.type] || AVATARS[MESSAGE_TYPES.AI_EXTERNAL];
          const isHTML = containsHTML(msg.content);
          
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              {/* 头像 */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: avatar.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: avatar.color,
                flexShrink: 0
              }}>
                {avatar.icon}
              </div>

              {/* 消息内容 */}
              <div style={{
                maxWidth: 'calc(100% - 36px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {!isUser && (
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginLeft: '4px'
                  }}>
                    {getMessageLabel(msg.type)}
                    {msg.metadata?.hasProducts && (
                      <span style={{ 
                        background: '#e6f7e6', 
                        color: '#2c7a2c', 
                        padding: '2px 6px', 
                        borderRadius: '12px',
                        fontSize: '10px',
                        marginLeft: '6px'
                      }}>
                        📦 {currentLanguage === 'zh' ? '含产品推荐' : 'Products'}
                      </span>
                    )}
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
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
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
            placeholder={getPlaceholder()}
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
          {getFooterText()}
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
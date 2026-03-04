// components/AdvancedChat.js - 适配您已部署API的版本
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

export default function AdvancedChat() {
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
  const [chatSize, setChatSize] = useState({ width: 420, height: 650 });
  const [isResizing, setIsResizing] = useState(false);
  const [sessionId, setSessionId] = useState(Date.now().toString());
  
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 调整窗口大小的逻辑
  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: chatSize.width,
      height: chatSize.height
    };
  };

  useEffect(() => {
    const handleResize = (e) => {
      if (!isResizing) return;
      
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      
      setChatSize({
        width: Math.max(320, Math.min(900, resizeStartRef.current.width + dx)),
        height: Math.max(480, Math.min(1000, resizeStartRef.current.height + dy))
      });
    };

    const stopResize = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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

      console.log('📥 收到响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 响应数据:', data);
      
      // 根据来源确定消息类型
      let messageType = MESSAGE_TYPES.AI_EXTERNAL;
      let metadata = { 
        source: data.source || 'AI',
        timestamp: data.timestamp 
      };

      if (data.fromFaq) {
        messageType = MESSAGE_TYPES.AI_FAQ;
        if (data.details) {
          metadata.faqCount = data.details.faqCount;
          metadata.productCount = data.details.productCount;
        }
        if (data.type === 'model_detail') {
          metadata.isProductDetail = true;
        }
      } else if (data.source === 'knowledge_base') {
        messageType = MESSAGE_TYPES.AI_FAQ;
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: messageType,
        content: data.response,
        timestamp: new Date(data.timestamp),
        metadata: metadata
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // 如果有sessionId更新
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('❌ API 调用错误:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.AI_EXTERNAL,
        content: `Error: ${error.message}. Please try again.`,
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

  // 格式化时间
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 渲染HTML内容（安全处理）
  const renderHTML = (html) => {
    return { __html: html };
  };

  // 获取消息类型标签
  const getMessageLabel = (type) => {
    return AVATARS[type]?.label || 'AI';
  };

  return (
    <div 
      ref={chatRef}
      style={{ 
        width: chatSize.width,
        height: chatSize.height,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* 调整大小手柄 */}
      <div
        onMouseDown={startResize}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          cursor: 'nw-resize',
          zIndex: 1000,
          background: 'linear-gradient(135deg, transparent 50%, #999 50%)'
        }}
      />

      {/* 头部 - 公司Logo和标题 */}
      <div style={{
        padding: '16px 20px',
        background: '#1a1a1a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid #333'
      }}>
        <div style={{
          width: 36,
          height: 36,
          background: '#1890ff',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 'bold'
        }}>
          C
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>CyberHome Support</div>
          <div style={{ fontSize: 12, color: '#999' }}>AI-Powered Customer Service</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20 }}>
            —
          </button>
          <button style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20 }}>
            □
          </button>
          <button style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20 }}>
            ×
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {messages.map((msg) => {
          const isUser = msg.type === MESSAGE_TYPES.USER;
          const avatar = AVATARS[msg.type] || AVATARS[MESSAGE_TYPES.AI_EXTERNAL];
          
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-start'
              }}
            >
              {/* 头像 */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: avatar.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: avatar.color,
                flexShrink: 0,
                border: msg.metadata?.isProductDetail ? '2px solid #f97316' : 'none'
              }}>
                {avatar.icon}
              </div>

              {/* 消息内容 */}
              <div style={{
                maxWidth: 'calc(100% - 40px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                {/* 发送者标签 */}
                {!isUser && (
                  <div style={{
                    fontSize: 11,
                    color: '#666',
                    marginLeft: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>{getMessageLabel(msg.type)}</span>
                    {msg.metadata?.source && msg.metadata.source !== 'knowledge_base' && (
                      <span style={{ color: '#999' }}>· {msg.metadata.source}</span>
                    )}
                    {msg.metadata?.productCount && (
                      <span style={{ 
                        background: '#e6f7e6', 
                        color: '#2c7a2c', 
                        padding: '2px 6px', 
                        borderRadius: 12,
                        fontSize: 10
                      }}>
                        {msg.metadata.productCount} products
                      </span>
                    )}
                  </div>
                )}

                {/* 消息气泡 */}
                <div style={{
                  padding: msg.content.includes('<div') ? 0 : '12px 16px',
                  borderRadius: 16,
                  background: isUser ? '#1890ff' : 'white',
                  color: isUser ? 'white' : '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  wordBreak: 'break-word',
                  fontSize: 14,
                  lineHeight: 1.5,
                  borderTopLeftRadius: isUser ? 16 : 4,
                  borderTopRightRadius: isUser ? 4 : 16,
                  overflow: 'hidden'
                }}>
                  {msg.content.includes('<div') ? (
                    <div dangerouslySetInnerHTML={renderHTML(msg.content)} />
                  ) : (
                    msg.content
                  )}
                </div>
                
                {/* 时间戳 */}
                <div style={{
                  fontSize: 11,
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

        {/* 加载状态 */}
        {loading && (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16
            }}>
              🤖
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'white',
              borderRadius: 16,
              borderTopLeftRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
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
        padding: '16px 20px',
        borderTop: '1px solid #eee',
        background: 'white'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#f8f9fa',
          borderRadius: 24,
          padding: '4px 4px 4px 16px',
          border: '1px solid #e0e0e0'
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
              padding: '10px 0',
              fontSize: 14,
              outline: 'none'
            }}
            disabled={loading}
          />

          {/* 发送按钮 */}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#f0f0f0' : '#1890ff',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              color: loading || !input.trim() ? '#999' : 'white',
              fontSize: 16,
              transition: 'all 0.3s'
            }}
          >
            ↑
          </button>
        </div>

        {/* 提示信息 */}
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: '#999',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 12
        }}>
          <span>Enter to send</span>
          <span style={{ color: '#52c41a' }}>📚 Knowledge Base</span>
          <span style={{ color: '#f97316' }}>🔍 Model Search</span>
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
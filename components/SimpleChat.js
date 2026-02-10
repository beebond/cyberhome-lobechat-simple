// components/SimpleChat.js - 简化版
import { useState } from 'react';

export default function SimpleChat() {
  const [messages, setMessages] = useState(['欢迎使用 CyberHome AI 聊天']);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessages = [...messages, `你: ${input}`, `AI: 已收到 "${input}"`];
    setMessages(newMessages);
    setInput('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f5f5f5' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8, padding: 8, background: 'white', borderRadius: 4 }}>
            {msg}
          </div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息..."
            style={{ flex: 1, padding: 8, marginRight: 8 }}
          />
          <button 
            onClick={sendMessage}
            style={{ padding: '8px 16px', background: '#1890ff', color: 'white', border: 'none' }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
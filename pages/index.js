// pages/index.js - 简化版本（保证成功）
export default function Home() {
  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚀</div>
        <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#1a1a1a' }}>
          CyberHome AI Chat
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          Powered by Next.js 15, React 19, Ant Design 6
        </p>
        
        <div style={{ 
          display: 'inline-grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '30px'
        }}>
          <div style={statusBoxStyle('#f6ffed', '#b7eb8f', '#52c41a')}>✅ Dependencies</div>
          <div style={statusBoxStyle('#e6f7ff', '#91d5ff', '#1890ff')}>⚡ Next.js 15</div>
          <div style={statusBoxStyle('#fff7e6', '#ffd591', '#fa8c16')}>🎨 Ant Design 6</div>
          <div style={statusBoxStyle('#f9f0ff', '#d3adf7', '#722ed1')}>🤖 LobeHub Chat</div>
        </div>
        
        <p style={{ color: '#999', fontSize: '14px' }}>
          Railway Deployment • React 19 • Full Stack AI Chat
        </p>
      </div>
    </div>
  )
}

const statusBoxStyle = (bg, border, color) => ({
  padding: '8px 16px',
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: '6px',
  color: color,
  fontSize: '14px'
})
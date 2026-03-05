// pages/index.js - 可调节窗口版
import SimpleChat from '../components/SimpleChat';

export default function Home() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5',
      margin: 0,
      padding: 0
    }}>
      <div style={{
        width: '420px',
        height: '650px',
        resize: 'both',
        overflow: 'auto',
        minWidth: '320px',
        minHeight: '480px',
        maxWidth: '900px',
        maxHeight: '1000px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
      }}>
        <SimpleChat />
      </div>
    </div>
  );
}
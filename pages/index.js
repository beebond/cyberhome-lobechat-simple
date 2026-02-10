// pages/index.js - 简洁优化版
import SimpleChat from '../components/SimpleChat';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px 16px'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        {/* 头部 */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '24px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '2.2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            CyberHome AI Chat
          </h1>
          <p style={{
            margin: 0,
            color: '#666',
            fontSize: '1.1rem'
          }}>
            基于自定义组件 • 无依赖冲突 • Railway 部署
          </p>
        </div>

        {/* 技术卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {['Next.js 15', 'React 19', '自定义组件', 'Railway'].map((tech, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                color: '#333',
                marginBottom: '8px',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>
                {tech}
              </div>
              <div style={{
                color: '#52c41a',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                ✅ 运行中
              </div>
            </div>
          ))}
        </div>

        {/* 聊天区域 */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              🤖 AI 智能聊天助手
            </h2>
            <p style={{
              margin: '8px 0 0 0',
              opacity: 0.9
            }}>
              安全、稳定、无依赖问题的自定义聊天组件
            </p>
          </div>
          
          <div style={{ height: '500px' }}>
            <SimpleChat />
          </div>
          
          <div style={{
            padding: '16px 24px',
            background: '#fafafa',
            borderTop: '1px solid #eee',
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            完全自定义实现 • 无第三方库依赖 • 100% 构建成功率
          </div>
        </div>

        {/* 页脚 */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          textAlign: 'center',
          color: 'white',
          opacity: 0.8
        }}>
          <p style={{ margin: 0 }}>
            © 2024 CyberHome AI Chat • 成功解决依赖冲突问题
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
            Built with ❤️ using Next.js & React
          </p>
        </div>
      </div>
    </div>
  );
}
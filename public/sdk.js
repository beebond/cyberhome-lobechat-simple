// lobe-chat-sdk.js - 类似Chatwoot的SDK
(function() {
  // 默认配置
  var config = window.lobeChatConfig || {
    baseUrl: 'https://cyberhome-lobechat-simple-production.up.railway.app',
    position: 'bottom-right',
    floating: true,
    width: 400,
    height: 600,
    buttonText: '💬',
    buttonColor: '#1890ff',
    buttonTextColor: '#ffffff',
    autoOpen: false,
    autoOpenDelay: 5000,
    requireAuth: false,
    accessCode: ''
  };
  
  // 添加样式
  var style = document.createElement('style');
  style.textContent = \`
    #lobeChatButton {
      position: fixed !important;
      z-index: 10000 !important;
      border: none !important;
      cursor: pointer !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      transition: all 0.2s ease !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    #lobeChatButton:hover {
      transform: scale(1.05) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
    }
    #lobeChatWindow {
      position: fixed !important;
      z-index: 9999 !important;
      background: white !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
      overflow: hidden !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      opacity: 0;
      visibility: hidden;
    }
    #lobeChatWindow.visible {
      opacity: 1;
      visibility: visible;
    }
    #lobeChatWindow iframe {
      border-radius: 12px;
    }
  \`;
  document.head.appendChild(style);
  
  // 位置配置
  var positionConfig = {
    'bottom-right': { 
      button: { bottom: '20px', right: '20px' },
      window: { bottom: '90px', right: '20px' }
    },
    'bottom-left': { 
      button: { bottom: '20px', left: '20px' },
      window: { bottom: '90px', left: '20px' }
    },
    'top-right': { 
      button: { top: '20px', right: '20px' },
      window: { top: '90px', right: '20px' }
    },
    'top-left': { 
      button: { top: '20px', left: '20px' },
      window: { top: '90px', left: '20px' }
    }
  };
  
  var pos = positionConfig[config.position] || positionConfig['bottom-right'];
  
  // 创建浮动按钮
  var button = document.createElement('button');
  button.id = 'lobeChatButton';
  button.innerHTML = config.buttonText;
  button.setAttribute('aria-label', 'CyberHome AI助手');
  button.setAttribute('title', '点击与AI助手聊天');
  
  button.style.cssText = Object.entries(pos.button)
    .map(([key, value]) => \`\${key}: \${value};\`)
    .join(' ') + \`
    background: \${config.buttonColor};
    color: \${config.buttonTextColor};
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 24px;
    font-weight: bold;
  \`;
  
  // 创建聊天窗口
  var chatWindow = document.createElement('div');
  chatWindow.id = 'lobeChatWindow';
  chatWindow.style.cssText = Object.entries(pos.window)
    .map(([key, value]) => \`\${key}: \${value};\`)
    .join(' ') + \`
    width: \${config.width}px;
    height: \${config.height}px;
    display: block;
  \`;
  
  // 创建iframe
  var iframe = document.createElement('iframe');
  iframe.src = config.baseUrl;
  iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
  iframe.allow = 'clipboard-write';
  iframe.title = 'CyberHome AI聊天助手';
  chatWindow.appendChild(iframe);
  
  // 添加到页面
  document.body.appendChild(button);
  document.body.appendChild(chatWindow);
  
  // 切换显示/隐藏
  var isVisible = false;
  
  function toggleChat() {
    isVisible = !isVisible;
    if (isVisible) {
      chatWindow.classList.add('visible');
      // 通知iframe可能需要
      try {
        iframe.contentWindow.postMessage({ type: 'CHAT_OPENED' }, '*');
      } catch (e) {}
    } else {
      chatWindow.classList.remove('visible');
    }
  }
  
  button.addEventListener('click', toggleChat);
  
  // 点击外部关闭
  document.addEventListener('click', function(e) {
    if (isVisible && 
        !chatWindow.contains(e.target) && 
        !button.contains(e.target)) {
      toggleChat();
    }
  });
  
  // ESC键关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isVisible) {
      toggleChat();
    }
  });
  
  // 自动打开
  if (config.autoOpen) {
    setTimeout(function() {
      if (!isVisible) toggleChat();
    }, config.autoOpenDelay || 5000);
  }
  
  // 暴露API
  window.lobeChatSDK = {
    toggle: toggleChat,
    open: function() {
      if (!isVisible) toggleChat();
    },
    close: function() {
      if (isVisible) toggleChat();
    },
    destroy: function() {
      button.remove();
      chatWindow.remove();
      style.remove();
    },
    updateConfig: function(newConfig) {
      Object.assign(config, newConfig);
      // 更新UI逻辑可以在这里添加
    }
  };
  
  // 初始化完成
  console.log('CyberHome LobeChat SDK 加载完成');
})();

// pages/api/chat.js - 完整修复版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 政策/售后关键词（优先级最高）
const POLICY_KEYWORDS = [
  'shipping', 'delivery', 'ship', 'arrive', '多长时间', '多久能到',
  'return', 'refund', 'send back', '退货', '退款',
  'warranty', 'repair', 'broken', '保修', '维修',
  'contact', 'support', '客服', '联系',
  'order status', 'track order', '订单状态',
  'cancel', 'exchange', '换货',
  'mexico', 'canada', '国际', 'international',
  'voltage', 'certification', '电压',
  'amazon', 'amazon order', '亚马逊'
];

// 产品查询关键词
const PRODUCT_KEYWORDS = [
  'have', 'got', 'looking for', 'need', 'want', 'buy',
  'price', 'cost', '多少钱', '价格', '推荐',
  'air fryer', 'toaster', 'kettle', 'blender', 'juicer',
  'yogurt', 'rice cooker', 'humidifier', 'massager',
  '肠粉机', '酸奶机', '空气炸锅', '电水壶',
  'model', '型号', '规格', 'compare', '对比',
  'replacement', 'parts', '配件', '替换', 'jar'
];

// 格式化产品卡片 - 只保留View Details
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  
  // 使用Shopify的图片占位符
  const defaultImage = 'https://cdn.shopify.com/s/files/1/0460/6066/7032/files/placeholder.png';
  
  products.slice(0, 3).forEach((p) => {
    // ✅ 正确：必须使用handle构建产品链接
    const productUrl = p.handle 
      ? `${STORE_URL}/products/${p.handle}`
      : `${STORE_URL}/search?q=${p.product_id}`; // 如果没有handle，用搜索页作为备用
    
    // ✅ 正确：使用原始image_url
    let imageUrl = defaultImage;
    if (p.image_url) {
      imageUrl = p.image_url.trim();
      // 处理可能的//开头的URL
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      // 确保是https
      imageUrl = imageUrl.replace(/^http:/, 'https:');
    }
    
    // 清理描述中的HTML
    let cleanDesc = '';
    if (p.description_short) {
      cleanDesc = p.description_short
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanDesc.length > 120) {
        const lastSpace = cleanDesc.substring(0, 120).lastIndexOf(' ');
        cleanDesc = cleanDesc.substring(0, lastSpace > 0 ? lastSpace : 120) + '...';
      }
    }
    
    // 产品卡片HTML
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">\n`;
    
    // 图片和基本信息行
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title || 'Bear Product'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${defaultImage}';">\n`;
    cards += `</div>\n`;
    
    // 产品信息
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px; color: #333;">${p.title || 'Bear Product'}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px; margin: 4px 0;">Model: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    // 描述
    if (cleanDesc) {
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}</div>\n`;
    }
    
    // Buy Now按钮 - 跳转产品页
    cards += `<div style="margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 Buy Now</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
}

// 格式化产品缺失表单
function formatRequestForm(productRequest) {
  return `
<div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; text-align: center;">
  <div style="font-size: 18px; margin-bottom: 10px;">🔍 Product Not Found</div>
  <p style="color: #4b5563; margin-bottom: 15px;">We couldn't find the exact product you're looking for. Leave your email and we'll notify you when it's available.</p>
  <form id="productRequestForm" style="display: flex; gap: 10px; max-width: 400px; margin: 0 auto;">
    <input type="email" placeholder="Your email address" style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" required>
    <button type="submit" style="padding: 10px 20px; background-color: #10b981; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">Notify Me</button>
  </form>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">We'll only use your email to notify you about this product.</p>
</div>
<script>
document.getElementById('productRequestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  const product = ${JSON.stringify(productRequest)};
  
  // 这里可以调用您的API保存请求
  console.log('Product request:', { email, product });
  
  // 显示成功消息
  const form = e.target;
  form.innerHTML = '<div style="color: #10b981; padding: 10px;">✓ Thank you! We\'ll notify you when this product is available.</div>';
});
</script>
  `;
}

// 判断意图 - 新优先级
function detectIntent(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // 1. 政策/售后类（优先级最高）
  if (POLICY_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'policy';
  }
  
  // 2. 产品查询类
  if (PRODUCT_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'product';
  }
  
  // 3. 默认
  return 'general';
}

// 计算产品相关性分数
function calculateProductScore(product, message) {
  let score = 0;
  const lowerMsg = message.toLowerCase();
  
  // 构建搜索文本
  const searchText = [
    product.title || '',
    product.description_short || '',
    product.category || '',
    product.product_id || '',
    ...(product.tags || [])
  ].join(' ').toLowerCase();
  
  // 提取关键词
  const keywords = lowerMsg.split(/\s+/).filter(k => k.length > 2);
  
  keywords.forEach(keyword => {
    if (searchText.includes(keyword)) {
      score += 2;
    }
    // 检查是否包含部分匹配
    if (searchText.includes(keyword.substring(0, keyword.length - 2))) {
      score += 1;
    }
  });
  
  // 特殊处理replacement jar for yogurt maker
  if (lowerMsg.includes('replacement') && lowerMsg.includes('jar') && lowerMsg.includes('yogurt')) {
    if (product.product_id === 'SNJ-C10T1BK' || product.title?.toLowerCase().includes('yogurt')) {
      score += 10;
    }
  }
  
  return score;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🔍 用户问题:', message);

    // === 1. 检测意图 ===
    const intent = detectIntent(message);
    console.log('🎯 意图:', intent);

    // === 2. 如果是政策类，直接返回FAQ（不调用OpenAI）===
    if (intent === 'policy') {
      try {
        const faqResponse = await fetch(`${FAQ_API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, type: 'faq' })
        });

        if (faqResponse.ok) {
          const faqData = await faqResponse.json();
          if (faqData.faqMatches && faqData.faqMatches.length > 0) {
            return res.status(200).json({
              response: faqData.faqMatches[0].answer,
              sessionId: sessionId || Date.now().toString(),
              timestamp: new Date().toISOString(),
              source: 'faq',
              hasProducts: false
            });
          }
        }
      } catch (error) {
        console.error('FAQ搜索失败:', error.message);
      }
      
      // 默认政策回复
      return res.status(200).json({
        response: 'For questions about shipping, returns, or policies, please visit our website footer or contact support@cyberhome.app',
        sessionId: sessionId || Date.now().toString(),
        timestamp: new Date().toISOString(),
        source: 'faq_default',
        hasProducts: false
      });
    }

    // === 3. 如果是产品查询，搜索产品 ===
    let relevantProducts = [];
    let matchedProducts = [];
    
    if (intent === 'product') {
      try {
        const searchResponse = await fetch(`${FAQ_API_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, type: 'product' })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const allProducts = searchData.productMatches || [];
          
          // 计算分数并排序
          const scored = allProducts.map(p => ({
            ...p,
            score: calculateProductScore(p, message)
          }));
          
          matchedProducts = scored
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score);
          
          // 只保留分数最高的3个，且分数>0
          relevantProducts = matchedProducts
            .filter(p => p.score > 2) // 提高阈值，避免无关产品
            .slice(0, 3);
          
          console.log('📦 相关产品:', relevantProducts.length, '总分:', relevantProducts.map(p => p.score));
        }
      } catch (error) {
        console.error('产品搜索失败:', error.message);
      }
    }

    // === 4. 调用OpenAI生成回复 ===
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 构建产品上下文
    let productContext = '';
    if (relevantProducts.length > 0) {
      productContext = '\nRelevant products found:\n';
      relevantProducts.forEach(p => {
        productContext += `- ${p.title} ($${p.price}, score: ${p.score})\n`;
      });
    }

    let systemPrompt = `You are a professional shopping assistant for CyberHome.

INTENT: ${intent}

CRITICAL RULES:
- ONLY mention products if intent is "product" AND relevant products are found
- If no relevant products found, suggest they leave their email for notification
- NEVER recommend products for policy/greeting questions
- Keep responses concise and helpful
- Use the same language as the user

${productContext ? 'Products found: ' + productContext : ''}

Brand info:
- Website: ${STORE_URL}
- Service: US & Canada only`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    let aiResponse = completion.choices[0].message.content;

    // === 5. 决定最终回复 ===
    let finalResponse = aiResponse;
    
    // 如果有相关产品，显示产品卡片
    if (intent === 'product' && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }
    
    // 如果是产品查询但没有找到相关产品，显示请求表单
    if (intent === 'product' && relevantProducts.length === 0) {
      const requestForm = formatRequestForm({ query: message });
      finalResponse = aiResponse + '\n\n' + requestForm;
    }

    res.status(200).json({
      response: finalResponse,
      sessionId: sessionId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: intent === 'product' ? 'product_search' : 'general_ai',
      hasProducts: relevantProducts.length > 0
    });

  } catch (error) {
    console.error('❌ API 错误:', error.message);
    
    res.status(500).json({
      response: 'Sorry, I am a bit busy right now. Please try again later.',
      sessionId: req.body.sessionId || Date.now().toString(),
      error: true,
      timestamp: new Date().toISOString()
    });
  }
}
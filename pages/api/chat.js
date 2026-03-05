// pages/api/chat.js - 完整最终版
import OpenAI from 'openai';

const STORE_URL = 'https://www.cyberhome.app';
const FAQ_API_URL = 'https://cyberhome-faq-api-production.up.railway.app';

// 会话记忆存储
const conversationHistory = new Map();

// 政策/售后关键词
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
  '肠粉机', '酸奶机', 'yaourtière', 'joghurt', 'yogurtera',
  '空气炸锅', '电水壶', 'model', '型号', '规格', 'compare', '对比',
  'replacement', 'parts', '配件', '替换', 'jar'
];

// 产品类型映射表 - 用于精确匹配
const PRODUCT_TYPE_MAP = {
  'yogurt maker': ['yogurt', 'yaourtière', 'joghurt', 'yogurtera', '酸奶机', 'SNJ'],
  'air fryer': ['air fryer', '空气炸锅', 'friteuse', 'QZG'],
  'rice cooker': ['rice cooker', '电饭煲', '米饭锅', 'cuiseur', 'DFB'],
  'baby food maker': ['baby food', '辅食机', 'SJJ', 'baby cooker'],
  'blender': ['blender', '搅拌机', 'mixeur', 'LLJ'],
  'juicer': ['juicer', '榨汁机', 'extracteur', 'YZJ'],
  'kettle': ['kettle', '电水壶', 'bouilloire', 'ZDH'],
  'toaster': ['toaster', '面包机', 'grille-pain', 'DSL'],
  'humidifier': ['humidifier', '加湿器', 'JSQ'],
  'dough maker': ['dough maker', '和面机', 'HMJ'],
  'sterilizer': ['sterilizer', '消毒器', 'XDG'],
  'rice roll steamer': ['rice roll', '肠粉机', '米粉机', 'cheong fun', 'CFJ']
};

// 格式化产品卡片
function formatProductCards(products) {
  if (!products || products.length === 0) return '';
  
  let cards = '';
  
  // 极简占位图
  const defaultImage = 'https://placehold.co/80x80/f5f5f5/999999?text=Bear';
  
  products.slice(0, 3).forEach((p) => {
    // ✅ 必须有handle才能构建链接
    if (!p.handle) {
      console.warn('跳过没有handle的产品:', p.product_id);
      return;
    }
    
    const productUrl = `${STORE_URL}/products/${p.handle}`;
    
    // ✅ 直接使用image_url，无需任何处理
    const imageUrl = p.image_url || defaultImage;
    
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
      
      if (cleanDesc.length > 100) {
        const lastSpace = cleanDesc.substring(0, 100).lastIndexOf(' ');
        cleanDesc = cleanDesc.substring(0, lastSpace > 0 ? lastSpace : 100) + '...';
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

// 判断意图
function detectIntent(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // 1. 政策/售后类
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

// 精确计算产品相关性分数
function calculateProductScore(product, message) {
  let score = 0;
  const lowerMsg = message.toLowerCase();
  
  // 构建搜索文本
  const searchText = [
    product.title || '',
    product.description_short || '',
    product.category || '',
    product.product_id || '',
    product.type || '',
    product.vendor || '',
    ...(product.tags || [])
  ].join(' ').toLowerCase();
  
  // 提取关键词
  const keywords = lowerMsg.split(/\s+/).filter(k => k.length > 2);
  
  // 检查是否是特定产品类型
  let detectedType = null;
  for (const [type, keywords_list] of Object.entries(PRODUCT_TYPE_MAP)) {
    if (keywords_list.some(k => lowerMsg.includes(k))) {
      detectedType = type;
      break;
    }
  }
  
  // 如果检测到产品类型，检查产品是否匹配
  if (detectedType) {
    const typeKeywords = PRODUCT_TYPE_MAP[detectedType] || [];
    for (const keyword of typeKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 10;
        break;
      }
    }
  }
  
  // 关键词匹配
  keywords.forEach(keyword => {
    if (keyword.length < 3) return;
    
    if (searchText.includes(keyword)) {
      score += 3;
    }
    
    if (product.product_id?.toLowerCase().includes(keyword)) {
      score += 5;
    }
  });
  
  // 特殊处理：酸奶机
  if (lowerMsg.includes('yogurt') || lowerMsg.includes('yaourtière') || lowerMsg.includes('酸奶')) {
    if (product.product_id?.includes('SNJ') || 
        product.title?.toLowerCase().includes('yogurt') ||
        product.category?.toLowerCase().includes('yogurt')) {
      score += 15;
    }
  }
  
  // 特殊处理：肠粉机
  if (lowerMsg.includes('rice roll') || lowerMsg.includes('肠粉') || lowerMsg.includes('米粉')) {
    if (product.product_id?.includes('CFJ') || 
        product.title?.toLowerCase().includes('rice roll') ||
        product.title?.toLowerCase().includes('肠粉')) {
      score += 15;
    }
  }
  
  // 特殊处理：replacement jar
  if (lowerMsg.includes('replacement') && lowerMsg.includes('jar')) {
    if (product.product_id === 'SNJ-C10T1BK' || 
        product.title?.toLowerCase().includes('jar') ||
        product.category?.toLowerCase().includes('accessories')) {
      score += 8;
    }
  }
  
  console.log(`产品 ${product.product_id} 得分: ${score}`);
  return score;
}

// 获取所有产品
async function getAllProducts() {
  try {
    const response = await fetch(`${FAQ_API_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'all', type: 'product' })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.productMatches || [];
    }
  } catch (error) {
    console.error('获取所有产品失败:', error.message);
  }
  return [];
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
    console.log('🆔 会话ID:', sessionId);

    // === 1. 检测意图 ===
    const intent = detectIntent(message);
    console.log('🎯 意图:', intent);

    // === 2. 政策类问题直接返回FAQ ===
    if (intent === 'policy') {
      const policyResponses = {
        shipping: 'Standard shipping takes 5-7 business days within the US. Expedited shipping (2-3 days) is available for an additional fee.',
        return: 'You can return your order within 30 days of receiving it. Please make sure the item is in its original condition with all tags attached.',
        warranty: 'Our products come with a 1-year warranty covering manufacturing defects. Please contact our support team with your order number to start a warranty claim.',
        canada: 'Yes, we currently serve customers in the US and Canada only.',
        default: 'For questions about shipping, returns, or policies, please visit our website footer or contact support@cyberhome.app'
      };
      
      let response = policyResponses.default;
      if (message.toLowerCase().includes('shipping') || message.toLowerCase().includes('delivery')) {
        response = policyResponses.shipping;
      } else if (message.toLowerCase().includes('return') || message.toLowerCase().includes('refund')) {
        response = policyResponses.return;
      } else if (message.toLowerCase().includes('warranty')) {
        response = policyResponses.warranty;
      } else if (message.toLowerCase().includes('canada')) {
        response = policyResponses.canada;
      }
      
      return res.status(200).json({
        response,
        sessionId: sessionId || Date.now().toString(),
        timestamp: new Date().toISOString(),
        source: 'policy',
        hasProducts: false
      });
    }

    // === 3. 产品查询 ===
    let relevantProducts = [];
    
    if (intent === 'product') {
      try {
        // 获取所有产品
        const allProducts = await getAllProducts();
        
        // 计算分数并排序
        const scored = allProducts.map(p => ({
          ...p,
          score: calculateProductScore(p, message)
        }));
        
        // 只保留分数高的产品（阈值设为5）
        relevantProducts = scored
          .filter(p => p.score >= 5)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        
        console.log('📦 相关产品:', relevantProducts.length);
        if (relevantProducts.length > 0) {
          console.log('产品列表:', relevantProducts.map(p => ({ 
            id: p.product_id, 
            title: p.title?.substring(0, 30),
            score: p.score 
          })));
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
      productContext = 'Relevant products we have in stock:\n';
      relevantProducts.forEach(p => {
        productContext += `- ${p.title} (Model: ${p.product_id}, Price: $${p.price})\n`;
      });
    }

    const systemPrompt = `You are a professional shopping assistant for CyberHome.

Current intent: ${intent}

CRITICAL RULES:
- ONLY mention products if intent is "product" AND we have relevant products
- If we have relevant products, enthusiastically tell them what we have
- If no relevant products found, politely apologize and offer to notify them
- Keep responses concise and helpful
- Use the same language as the user

${productContext ? 'Products we have:\n' + productContext : ''}

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
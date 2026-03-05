// pages/api/chat.js - 修复产品匹配算法
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

// 产品类型映射表 - 增强版
const PRODUCT_TYPE_MAP = {
  'yogurt maker': {
    keywords: ['yogurt', 'yaourtière', 'joghurt', 'yogurtera', '酸奶', '酸奶机', 'SNJ'],
    product_ids: ['SNJ-C10H2', 'SNJ-C10T1BK', 'SNJ-A15K1']
  },
  'air fryer': {
    keywords: ['air fryer', '空气炸锅', 'friteuse', 'QZG'],
    product_ids: ['QZG-T17U7', 'QZG-S08C3', 'QZG-P15J5', 'QZG-F15E3', 'QZG-B14C1']
  },
  'rice cooker': {
    keywords: ['rice cooker', '电饭煲', '米饭锅', 'cuiseur', 'DFB'],
    product_ids: ['DFB-B16C1', 'DFB-B20K1', 'DFB-B12W1', 'DFB-P20T5']
  },
  'baby food maker': {
    keywords: ['baby food', '辅食机', 'baby cooker', 'SJJ'],
    product_ids: ['SJJ-M03P1', 'SJJ-R03B5', 'B0FL7K9WMX']
  },
  'blender': {
    keywords: ['blender', '搅拌机', 'mixeur', 'LLJ'],
    product_ids: ['LLJ-B03C1', 'LLJ-B08J5', 'LLJ-B12K1', 'LLJ-P03T5', 'LLJ-C04G5']
  },
  'juicer': {
    keywords: ['juicer', '榨汁机', 'extracteur', 'YZJ'],
    product_ids: ['YZJ-E01J5', 'TER-SJ01']
  },
  'kettle': {
    keywords: ['kettle', '电水壶', 'bouilloire', 'ZDH'],
    product_ids: ['ZDH-Q17W5', 'ZDH-A17V5', 'ZDH-A12R2', 'ZDH-D17K3', 'ZDH-H50H3']
  },
  'toaster': {
    keywords: ['toaster', '面包机', 'grille-pain', 'DSL'],
    product_ids: ['DSL-P02D5', 'DSL-C02A1']
  },
  'humidifier': {
    keywords: ['humidifier', '加湿器', 'JSQ'],
    product_ids: ['JSQ-B25W7', 'JSQ-F60A4', 'JSQ-C45C5', 'JSQ-230WB']
  },
  'dough maker': {
    keywords: ['dough maker', '和面机', 'HMJ'],
    product_ids: ['HMJ-A35M1', 'HMJ-A35Q3', 'HMJ-A70C1', 'HMJ-A50B1']
  },
  'sterilizer': {
    keywords: ['sterilizer', '消毒器', 'XDG'],
    product_ids: ['XDG-B05V', 'QXJ-C05F3']
  },
  'rice roll steamer': {
    keywords: ['rice roll', '肠粉', '肠粉机', '米粉', '米粉机', 'cheong fun', 'CFJ'],
    product_ids: ['CFJ-A80B2', 'CFJ-A30Q3']
  }
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
    
    // ✅ 直接使用image_url
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
    
    cards += `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">\n`;
    cards += `<div style="display: flex; gap: 15px; margin-bottom: 10px;">\n`;
    cards += `<div style="width: 80px; height: 80px; flex-shrink: 0; background: #f8f9fa; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">\n`;
    cards += `<img src="${imageUrl}" alt="${p.title || 'Bear Product'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${defaultImage}';">\n`;
    cards += `</div>\n`;
    cards += `<div style="flex: 1;">\n`;
    cards += `<div style="font-weight: 600; font-size: 15px; color: #333;">${p.title || 'Bear Product'}</div>\n`;
    cards += `<div style="color: #666; font-size: 12px; margin: 4px 0;">Model: ${p.product_id || 'N/A'}</div>\n`;
    if (p.price) {
      cards += `<div style="color: #f97316; font-weight: 600; font-size: 16px;">💰 $${p.price}</div>\n`;
    }
    cards += `</div>\n`;
    cards += `</div>\n`;
    
    if (cleanDesc) {
      cards += `<div style="color: #4b5563; font-size: 13px; line-height: 1.5; margin: 10px 0;">${cleanDesc}</div>\n`;
    }
    
    cards += `<div style="margin-top: 12px;">\n`;
    cards += `<a href="${productUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">🔗 Buy Now</a>\n`;
    cards += `</div>\n`;
    cards += `</div>\n`;
  });
  
  return cards;
}

// 判断意图
function detectIntent(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  if (POLICY_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'policy';
  }
  
  if (PRODUCT_KEYWORDS.some(keyword => lowerMsg.includes(keyword))) {
    return 'product';
  }
  
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
    ...(product.tags || [])
  ].join(' ').toLowerCase();
  
  // 1. 产品ID直接匹配（最高分）
  if (product.product_id && lowerMsg.includes(product.product_id.toLowerCase())) {
    score += 50;
  }
  
  // 2. 检查是否是特定产品类型
  for (const [type, config] of Object.entries(PRODUCT_TYPE_MAP)) {
    // 检查关键词匹配
    const keywordMatch = config.keywords.some(k => lowerMsg.includes(k));
    if (keywordMatch) {
      // 如果产品ID在预设列表中，加高分
      if (config.product_ids.includes(product.product_id)) {
        score += 30;
      }
      // 检查标题和描述是否包含类型关键词
      if (searchText.includes(type) || 
          config.keywords.some(k => searchText.includes(k))) {
        score += 20;
      }
    }
  }
  
  // 3. 关键词匹配
  const keywords = lowerMsg.split(/\s+/).filter(k => k.length > 2);
  keywords.forEach(keyword => {
    if (searchText.includes(keyword)) {
      score += 5;
    }
    // 标题开头匹配（更重要）
    if (product.title?.toLowerCase().startsWith(keyword)) {
      score += 8;
    }
  });
  
  // 4. 特殊处理：酸奶机
  if (lowerMsg.includes('yogurt') || lowerMsg.includes('yaourtière') || lowerMsg.includes('酸奶')) {
    if (product.product_id?.startsWith('SNJ')) {
      score += 40;
    }
    if (product.title?.toLowerCase().includes('yogurt')) {
      score += 35;
    }
  }
  
  // 5. 特殊处理：肠粉机
  if (lowerMsg.includes('rice roll') || lowerMsg.includes('肠粉') || lowerMsg.includes('米粉')) {
    if (product.product_id?.startsWith('CFJ')) {
      score += 40;
    }
    if (product.title?.toLowerCase().includes('rice roll')) {
      score += 35;
    }
  }
  
  // 6. 特殊处理：婴儿辅食机
  if (lowerMsg.includes('baby food') || lowerMsg.includes('辅食')) {
    if (product.product_id?.startsWith('SJJ')) {
      score += 40;
    }
  }
  
  // 7. 特殊处理：搅拌机
  if (lowerMsg.includes('blender') || lowerMsg.includes('搅拌')) {
    if (product.product_id?.startsWith('LLJ')) {
      score += 40;
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

    // === 2. 政策类问题直接返回 ===
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
        const allProducts = await getAllProducts();
        
        // 计算分数
        const scored = allProducts.map(p => ({
          ...p,
          score: calculateProductScore(p, message)
        }));
        
        // 降低阈值，确保能找到产品
        relevantProducts = scored
          .filter(p => p.score >= 15) // 降低阈值到15
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
    } else {
      // 即使没有高分产品，也检查是否有任何匹配
      const allProducts = await getAllProducts();
      const anyMatch = allProducts.some(p => 
        p.product_id?.startsWith('SNJ') || 
        p.product_id?.startsWith('CFJ') ||
        p.title?.toLowerCase().includes('yogurt') ||
        p.title?.toLowerCase().includes('肠粉')
      );
      
      if (anyMatch) {
        console.log('⚠️ 有匹配但分数不足，降低阈值重试');
        const scored = allProducts.map(p => ({
          ...p,
          score: calculateProductScore(p, message)
        }));
        relevantProducts = scored
          .filter(p => p.score >= 10)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
      }
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
    
    if (intent === 'product' && relevantProducts.length > 0) {
      const productCards = formatProductCards(relevantProducts);
      finalResponse = aiResponse + '\n\n【Related Products】\n' + productCards;
    }
    
    if (intent === 'product' && relevantProducts.length === 0) {
      // 检查是否有已知产品但分数不足
      const allProducts = await getAllProducts();
      const hasProduct = allProducts.some(p => 
        (message.toLowerCase().includes('yogurt') && p.product_id?.startsWith('SNJ')) ||
        (message.toLowerCase().includes('rice roll') && p.product_id?.startsWith('CFJ')) ||
        (message.toLowerCase().includes('baby food') && p.product_id?.startsWith('SJJ'))
      );
      
      if (hasProduct) {
        // 如果有产品但没匹配上，手动返回
        const manualProducts = allProducts.filter(p => 
          (message.toLowerCase().includes('yogurt') && p.product_id?.startsWith('SNJ')) ||
          (message.toLowerCase().includes('rice roll') && p.product_id?.startsWith('CFJ')) ||
          (message.toLowerCase().includes('baby food') && p.product_id?.startsWith('SJJ'))
        ).slice(0, 3);
        
        if (manualProducts.length > 0) {
          const productCards = formatProductCards(manualProducts);
          finalResponse = `Yes, we have ${manualProducts.length > 1 ? 'several' : 'a'} ${message.includes('yogurt') ? 'yogurt maker' : 'product'} available! Here are our options:\n\n【Related Products】\n` + productCards;
        }
      } else {
        const requestForm = formatRequestForm({ query: message });
        finalResponse = aiResponse + '\n\n' + requestForm;
      }
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
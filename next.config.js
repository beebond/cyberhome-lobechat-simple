// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Railway 生产部署关键配置
  output: 'standalone', // 生成独立部署包
  
  // 构建时忽略错误（防止因警告导致部署失败）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript 错误忽略（如果有）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 图片配置
  images: {
    unoptimized: true, // Railway 建议关闭图片优化
  },
  
  // 如果需要，添加其他配置
}

module.exports = nextConfig
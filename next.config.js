/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 关键配置：只声明自定义的环境变量
  // 不要包含 NODE_ENV、PORT 等 Next.js 内置变量
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ACCESS_CODE: process.env.ACCESS_CODE,
    // 只放自定义变量，不要放 NODE_ENV、PORT 等
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true,
  },
  
  output: 'standalone',
};

module.exports = nextConfig;
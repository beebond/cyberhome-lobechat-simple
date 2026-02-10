/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用严格模式
  reactStrictMode: true,
  
  // 关键配置：明确声明运行时环境变量
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ACCESS_CODE: process.env.ACCESS_CODE,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  
  // 忽略 ESLint 错误
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 忽略 TypeScript 错误
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 图片优化设置
  images: {
    unoptimized: true,
  },
  
  // 重要：输出为独立部署，更适合 Railway
  output: 'standalone',
  
  // 可选：添加安全头（调试时可暂时放宽）
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
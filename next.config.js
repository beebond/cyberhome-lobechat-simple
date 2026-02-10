/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,
  
  // 关键配置：明确声明运行时环境变量
  // 这些变量将在服务器端运行时通过 process.env 访问
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ACCESS_CODE: process.env.ACCESS_CODE,
    // 注意：不要包含 NODE_ENV、PORT 等 Next.js 内置变量
  },
  
  // 构建时忽略 ESLint 错误
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 构建时忽略 TypeScript 错误
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 图片配置：禁用默认优化（可节省内存）
  images: {
    unoptimized: true,
  },
  
  // 重要：已移除 output: 'standalone' 配置
  // 原配置：output: 'standalone' - 这会与 Railway 环境变量注入冲突
  
  // 可选：自定义 Webpack 配置（如有需要）
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     // 客户端特定配置
  //   }
  //   return config;
  // },
  
  // 可选：重定向配置
  // async redirects() {
  //   return [
  //     {
  //       source: '/old-path',
  //       destination: '/new-path',
  //       permanent: true,
  //     },
  //   ];
  // },
  
  // 可选：自定义头部配置
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'X-Custom-Header',
  //           value: 'my-custom-value',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
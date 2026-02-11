/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,
  
  // ❌ 重要：删除整个 env 配置块
  // 不要在这里声明任何环境变量
  // Railway 会在运行时自动注入环境变量，无需手动配置
  
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
  
  // ✅ 关键：启用 standalone 输出模式
  // 这确保 API 路由被正确打包
  output: 'standalone',
  
  // 可选：实验性功能
  experimental: {
    // 确保输出文件追踪正确
    outputFileTracingRoot: __dirname,
  },
  
  // 可选：自定义 Webpack 配置（如无特殊需要，保持注释）
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
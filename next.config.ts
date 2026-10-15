import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makers 的预览部署从这个前缀加载静态资源；不要用 basePath
  assetPrefix: process.env.EDGEONE_PREVIEW_ASSET_PREFIX,
  experimental: {
    // radix-ui 从一个入口导出全部组件，不在 Next 默认按需引入的名单里；不加的话后台每页多带约 80 KB
    optimizePackageImports: ["radix-ui"],
    // 图片上传走 Server Action，单张最大 1 MB，加上表单开销放宽到 2 MB
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;

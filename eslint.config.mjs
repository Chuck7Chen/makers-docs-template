import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 站点之间按域名区分，链接都用普通 <a>，不用 next/link 的客户端跳转
      "@next/next/no-html-link-for-pages": "off",
      // logo 和正文图片来自 Blob，尺寸未知，不走 next/image
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", ".edgeone/**", ".blob-local/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;

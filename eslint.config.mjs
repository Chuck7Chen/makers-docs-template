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
      // Links that cross domains (admin to a site, platform to a site) must be plain <a>; reader links use components/doc-link
      "@next/next/no-html-link-for-pages": "off",
      // Logos and content images come from Blob with unknown sizes, so next/image is not used
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: ["node_modules/**", "**/.next/**", "**/.next-dev/**", "**/.edgeone/**", ".blob-local/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;

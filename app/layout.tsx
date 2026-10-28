import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "EdgeOne Makers 多租户模板",
  description: "一个项目、一次部署，按域名服务所有租户。",
  keywords: ["EdgeOne Makers", "EdgeOne Pages", "Next.js", "多租户", "SaaS", "multi-tenant"],
  // Platform pages use the EdgeOne icon; each docs site overrides it with its own icon in app/s/[site]/layout.tsx
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_ICON, faviconDataUri } from "@/lib/icons";
import { DEFAULT_THEME } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "文档站多租户模板",
  description: "一个项目、一次部署，按域名服务所有文档站。",
  icons: { icon: faviconDataUri(DEFAULT_ICON, DEFAULT_THEME) },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}

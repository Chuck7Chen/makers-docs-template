"use client";

import { useEffect } from "react";

// 正文是服务端渲染的 HTML，代码块的复制按钮统一用一个监听器处理
export function CopyCode() {
  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest("[data-copy]");
      if (!(button instanceof HTMLButtonElement)) return;
      const code = button.parentElement?.querySelector("pre")?.innerText ?? "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "已复制";
      } catch {
        button.textContent = "复制失败";
      }
      setTimeout(() => {
        button.textContent = "复制";
      }, 1500);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

// Content is server-rendered HTML, so a single listener handles all code-block copy buttons
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

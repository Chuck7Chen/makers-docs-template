"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Links inside the Markdown content are plain <a> in server-rendered HTML. Same-site page links are handed to the
// client router, like the sidebar's links; in-page anchors, files such as /sitemap.xml and other sites are left alone
function pageLink(event: Event) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(".doc a[href]");
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname.split("/").pop()!.includes(".")) return null;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return null;
  return url.pathname + url.search + url.hash;
}

export function ContentLinks() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = pageLink(event);
      if (!href) return;
      event.preventDefault();
      router.push(href);
    };
    const onPointerOver = (event: PointerEvent) => {
      const href = pageLink(event);
      if (href) router.prefetch(href);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("pointerover", onPointerOver);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", onPointerOver);
    };
  }, [router]);
  return null;
}

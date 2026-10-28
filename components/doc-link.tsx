"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string };

// In-site reader links navigate client-side: the header, sidebar and search index stay loaded and only the page
// content is fetched. Viewport prefetching is off because every request passes the middleware's Blob-backed gate
// and a sidebar can hold 30 links; the target is prefetched once the pointer, keyboard or a finger reaches the link
export function DocLink({ href, onClick, ...props }: Props) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={(event) => {
        // Collapse the mobile navigation once a page is picked
        event.currentTarget.closest("details")?.removeAttribute("open");
        onClick?.(event);
      }}
    />
  );
}

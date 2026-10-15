"use client";

import { cn } from "cn";
import { Files, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

export function AdminTabs({ handle }: { handle: string }) {
  const pathname = usePathname();
  const base = `/admin/${handle}`;
  const tabs = [
    { href: base, label: "页面", icon: Files, active: pathname === base || pathname.startsWith(`${base}/edit/`) },
    { href: `${base}/settings`, label: "设置", icon: Settings, active: pathname === `${base}/settings` },
  ];
  return (
    <nav className="mt-6 flex gap-6 border-b text-sm">
      {tabs.map(({ href, label, icon: TabIcon, active }) => (
        <a
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors",
            active
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <TabIcon className="size-4" />
          {label}
        </a>
      ))}
    </nav>
  );
}

import { BookOpenText } from "lucide-react";
import { cn } from "cn";

export function PlatformBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <a href={href} className={cn("flex min-w-0 items-center gap-2 text-zinc-950", className)} aria-label="Tenant Docs">
      <BookOpenText className="text-primary size-4 shrink-0" strokeWidth={2.2} />
      <span className="truncate text-xs font-bold tracking-[0.08em] sm:text-sm">TENANT DOCS</span>
    </a>
  );
}

import { Boxes } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";

export function PlatformBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2 text-zinc-950", className)} aria-label="Multi-Tenant Template">
      <Boxes className="text-primary size-4 shrink-0" strokeWidth={2.2} />
      <span className="truncate text-xs font-bold tracking-[0.08em] sm:text-sm">MULTI-TENANT</span>
    </Link>
  );
}

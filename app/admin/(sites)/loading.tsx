import { Skeleton } from "@/components/ui/skeleton";

// "My sites" renders per request; this fills the content area right away on navigation while the header stays.
// The route group keeps the boundary off /admin/[site], whose layout must finish its access check (and redirect) before streaming
export default function SitesLoading() {
  return (
    <div role="status" aria-label="加载中">
      <Skeleton className="h-8 w-48 bg-foreground/6" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full bg-foreground/6" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4 rounded-lg border bg-background p-4">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

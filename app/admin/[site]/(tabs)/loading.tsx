import { Skeleton } from "@/components/ui/skeleton";

// Switching tabs keeps the site header and tabs; only the panel below waits for the server. The editor stays out of
// this route group: it always opens with a full page load, where a boundary would only hold its content back behind a skeleton
export default function TabLoading() {
  return (
    <div role="status" aria-label="加载中" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }, (_, row) => (
          <Skeleton key={row} className="h-8" />
        ))}
      </div>
    </div>
  );
}

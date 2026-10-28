import { getStore, type Store, type StoreOptions } from "@edgeone/pages-blob";
import { resolveLiveSite, storeReaders, type LiveSite } from "@/lib/lifecycle";

// Edge Middleware only: reads through the Pages Blob SDK and never touches the Node file system, unlike lib/blob.ts

// Every request runs the gate before the CDN cache, and each Blob read adds a few hundred milliseconds. Live sites
// are remembered per edge instance for this long, so deleting a site or unbinding a domain takes up to this long to
// apply. Expiry stays exact because expiresAt is checked on every hit, and missing sites are never remembered
const LIVE_SITE_TTL_MS = 10_000;
const MAX_REMEMBERED = 1000;

let store: Store | undefined;
const remembered = new Map<string, { at: number; site: LiveSite }>();

function readJSON<T>(key: string) {
  store ??= getStore({ name: "docs", consistency: "strong" } as StoreOptions);
  return store.get(key, { type: "json" }) as Promise<T | null>;
}

// source says whether this request read Blob, for the Server-Timing header set by the middleware
export async function resolveLiveSiteAtEdge(identifier: string): Promise<{ site: LiveSite | null; source: "memory" | "blob" }> {
  const now = Date.now();
  const hit = remembered.get(identifier);
  if (hit && now - hit.at < LIVE_SITE_TTL_MS && (hit.site.expiresAt === undefined || hit.site.expiresAt > now)) {
    return { site: hit.site, source: "memory" };
  }
  remembered.delete(identifier);

  const site = await resolveLiveSite(identifier, storeReaders(readJSON));
  if (site) {
    // Map keeps insertion order, so the first key is the oldest entry
    if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value!);
    remembered.set(identifier, { at: Date.now(), site });
  }
  return { site, source: "blob" };
}

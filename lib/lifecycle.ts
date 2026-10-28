// Shared by the Edge Middleware and the Node routes, so it must not depend on Node APIs
import { keys } from "@/lib/keys";
import { isValidHandle, isValidHost } from "@/lib/rules";

export const PRIVATE_CACHE = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
};

export type DomainMapping = { handle: string; siteCreatedAt?: number };

export type LiveSite = {
  handle: string;
  createdAt: number;
  expiresAt?: number;
  domains: string[];
};

type Readers<T> = {
  site: (handle: string) => Promise<T | null>;
  domain: (host: string) => Promise<DomainMapping | null>;
};

export function storeReaders(readJSON: <T>(key: string) => Promise<T | null>): Readers<LiveSite> {
  return {
    site: (handle) => readJSON<LiveSite>(keys.site(handle)),
    domain: (host) => readJSON<DomainMapping>(keys.domain(host)),
  };
}

// The identifier is a handle or a custom domain (contains a dot). Expired sites, and domain mappings that point
// at a different site or at a deleted site whose handle was reused, resolve to null
export async function resolveLiveSite<T extends LiveSite>(identifier: string, read: Readers<T>): Promise<T | null> {
  const isDomain = identifier.includes(".");
  if (isDomain ? !isValidHost(identifier) : !isValidHandle(identifier)) return null;
  const mapping = isDomain ? await read.domain(identifier) : null;
  const handle = isDomain ? mapping?.handle : identifier;
  if (!handle || !isValidHandle(handle)) return null;
  const site = await read.site(handle);
  if (!site || site.handle !== handle || !Number.isFinite(site.createdAt) || !Array.isArray(site.domains)) return null;
  if (site.expiresAt !== undefined && (!Number.isFinite(site.expiresAt) || site.expiresAt <= Date.now())) return null;
  if (mapping && (!site.domains.includes(identifier) || (mapping.siteCreatedAt !== undefined && mapping.siteCreatedAt !== site.createdAt))) {
    return null;
  }
  return site;
}

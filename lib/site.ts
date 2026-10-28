import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { cache } from "react";
import { readJSON } from "@/lib/blob";
import { keys } from "@/lib/keys";
import { resolveLiveSite, type DomainMapping } from "@/lib/lifecycle";
import type { NavItem } from "@/lib/nav";
import { ROOT_DOMAIN } from "@/lib/rules";

export type SiteConfig = {
  handle: string;
  name: string;
  description: string;
  icon: string;
  // Only present in older data; logos are no longer supported
  logo?: string;
  theme: string;
  domains: string[];
  nav: NavItem[];
  createdAt: number;
  // New sites are 24-hour demo sites; optional fields keep existing long-lived site data compatible
  expiresAt?: number;
  version: number;
};

export type PageDoc = { markdown: string; description: string; updatedAt: number };

export type SearchEntry = { headings: string[]; text: string };
export type SearchIndex = Record<string, SearchEntry>;

export function isTemporary(site: SiteConfig) {
  return site.expiresAt !== undefined;
}

export function isExpired(site: SiteConfig) {
  return site.expiresAt !== undefined && site.expiresAt <= Date.now();
}

export function formatRemaining(expiresAt: number) {
  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} 小时 ${minutes % 60} 分钟` : `${minutes} 分钟`;
}

// The site's canonical origin for sitemap and canonical links; the first custom domain if one is registered
export function siteOrigin(site: SiteConfig) {
  return `https://${site.domains[0] ?? `${site.handle}.${ROOT_DOMAIN}`}`;
}

// URL for "View site" in the admin; uses http and the port in local dev
export function subdomainOrigin(handle: string, requestHost: string) {
  const port = requestHost.match(/:\d+$/)?.[0] ?? "";
  return `${port ? "http" : "https"}://${handle}.${ROOT_DOMAIN}${port}`;
}

export async function requestHost() {
  const all = await headers();
  const forwarded = process.env.NODE_ENV === "development" ? all.get("x-forwarded-host") : null;
  return forwarded ?? all.get("host") ?? "";
}

// The admin and Server Actions read Blob directly, deduplicated within a request
export const loadSite = cache((handle: string) => readJSON<SiteConfig>(keys.site(handle)));

// Reader data has no time-based revalidation; writes must invalidate the matching tags and page paths.

const REVALIDATE = false;

const getSite = cache((handle: string) =>
  unstable_cache(() => readJSON<SiteConfig>(keys.site(handle)), ["site", handle], {
    tags: [`site:${handle}`],
    revalidate: REVALIDATE,
  })(),
);

const getDomainMapping = cache((host: string) =>
  unstable_cache(
    () => readJSON<DomainMapping>(keys.domain(host)),
    ["domain", host],
    { tags: [`domain:${host}`], revalidate: REVALIDATE },
  )(),
);

export const getPage = cache((handle: string, slug: string) =>
  unstable_cache(() => readJSON<PageDoc>(keys.page(handle, slug)), ["page", handle, slug], {
    tags: [`page:${handle}:${slug}`, `content:${handle}`],
    revalidate: REVALIDATE,
  })(),
);

export const getSearchIndex = cache((handle: string) =>
  unstable_cache(
    async () => (await readJSON<SearchIndex>(keys.search(handle))) ?? {},
    ["search", handle],
    { tags: [`search:${handle}`, `content:${handle}`], revalidate: REVALIDATE },
  )(),
);

// The route param is a handle or a custom domain; expired temporary sites are treated as missing
export const resolveSite = cache((site: string) => resolveLiveSite(site, { site: getSite, domain: getDomainMapping }));

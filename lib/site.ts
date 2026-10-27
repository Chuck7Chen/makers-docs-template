import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { cache } from "react";
import { readJSON } from "@/lib/blob";
import type { NavItem } from "@/lib/nav";
import { isValidHandle, isValidHost, ROOT_DOMAIN } from "@/lib/rules";

export type SiteConfig = {
  handle: string;
  name: string;
  description: string;
  icon: string;
  logo?: string;
  theme: string;
  domains: string[];
  nav: NavItem[];
  createdAt: number;
  // New sites are 24-hour demo sites; optional fields keep existing long-lived site data compatible
  expiresAt?: number;
  version: number;
};

export type DomainMapping = { handle: string; siteCreatedAt?: number };

export type PageDoc = { markdown: string; description: string; updatedAt: number };

export type SearchEntry = { headings: string[]; text: string };
export type SearchIndex = Record<string, SearchEntry>;

export const keys = {
  site: (handle: string) => `sites/${handle}/site.json`,
  page: (handle: string, slug: string) => `sites/${handle}/pages/${slug}.json`,
  search: (handle: string) => `sites/${handle}/search.json`,
  auth: (handle: string) => `sites/${handle}/auth.json`,
  asset: (handle: string, file: string) => `sites/${handle}/assets/${file}`,
  siteDir: (handle: string) => `sites/${handle}/`,
  domain: (host: string) => `domains/${host}.json`,
  expiry: (expiresAt: number, handle: string) => `expiry/${expiresAt}_${handle}`,
};

// Image file names are 24 random hex characters plus an extension determined by the file magic bytes at upload
export const IMAGE_FILE_RE = /^[a-f0-9]{24}\.(png|jpg|gif|webp)$/;
export const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

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

// The route param is a handle or a custom domain (contains a dot); expired temporary sites are treated as missing
export const resolveSite = cache(async (site: string) => {
  const isDomain = site.includes(".");
  if (isDomain && !isValidHost(site)) return null;
  const mapping = isDomain ? await getDomainMapping(site) : null;
  const handle = isDomain ? mapping?.handle : site;
  if (!handle || !isValidHandle(handle)) return null;
  const config = await getSite(handle);
  if (!config || isExpired(config)) return null;
  if (isDomain && (!config.domains.includes(site) || (mapping?.siteCreatedAt !== undefined && mapping.siteCreatedAt !== config.createdAt))) {
    return null;
  }
  return config;
});

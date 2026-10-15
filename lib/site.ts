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
  // 只有访客建的临时站点有
  expiresAt?: number;
  version: number;
};

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

// 图片文件名是 24 位随机十六进制加扩展名，扩展名由上传时的文件头决定
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

// 站点的正式地址，用于 sitemap 和 canonical；登记了自有域名就用第一个
export function siteOrigin(site: SiteConfig) {
  return `https://${site.domains[0] ?? `${site.handle}.${ROOT_DOMAIN}`}`;
}

// 后台里“查看站点”的地址，本地开发时带上端口、用 http
export function subdomainOrigin(handle: string, requestHost: string) {
  const port = requestHost.match(/:\d+$/)?.[0] ?? "";
  return `${port ? "http" : "https"}://${handle}.${ROOT_DOMAIN}${port}`;
}

export async function requestHost() {
  const all = await headers();
  const forwarded = process.env.NODE_ENV === "development" ? all.get("x-forwarded-host") : null;
  return forwarded ?? all.get("host") ?? "";
}

// 后台和 Server Action 直接读 Blob，同一次请求内去重
export const loadSite = cache((handle: string) => readJSON<SiteConfig>(keys.site(handle)));

// 阅读端的读取都带缓存标签，写入时按标签失效，兜底一天

const REVALIDATE = 86400;

const getSite = cache((handle: string) =>
  unstable_cache(() => readJSON<SiteConfig>(keys.site(handle)), ["site", handle], {
    tags: [`site:${handle}`],
    revalidate: REVALIDATE,
  })(),
);

const getDomainHandle = cache((host: string) =>
  unstable_cache(
    async () => (await readJSON<{ handle: string }>(keys.domain(host)))?.handle ?? null,
    ["domain", host],
    { tags: [`domain:${host}`], revalidate: REVALIDATE },
  )(),
);

export const getPage = cache((handle: string, slug: string) =>
  unstable_cache(() => readJSON<PageDoc>(keys.page(handle, slug)), ["page", handle, slug], {
    tags: [`page:${handle}:${slug}`],
    revalidate: REVALIDATE,
  })(),
);

export const getSearchIndex = cache((handle: string) =>
  unstable_cache(
    async () => (await readJSON<SearchIndex>(keys.search(handle))) ?? {},
    ["search", handle],
    { tags: [`search:${handle}`], revalidate: REVALIDATE },
  )(),
);

// 路由参数是 handle 或者自有域名（带点），过期的临时站点按不存在处理
export const resolveSite = cache(async (site: string) => {
  const isDomain = site.includes(".");
  if (isDomain && !isValidHost(site)) return null;
  const handle = isDomain ? await getDomainHandle(site) : site;
  if (!handle || !isValidHandle(handle)) return null;
  const config = await getSite(handle);
  if (!config || isExpired(config)) return null;
  return config;
});

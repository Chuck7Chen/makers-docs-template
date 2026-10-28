import { randomBytes } from "node:crypto";
import { createToken, grantSiteAccess, hashToken } from "@/lib/access";
import { listKeys, readJSON, remove, writeJSON } from "@/lib/blob";
import { MAX_CLEANUP_PER_RUN, MAX_TEMP_SITES, TEMP_SITE_TTL_MS } from "@/lib/demo";
import { UserError } from "@/lib/forms";
import { DEFAULT_ICON } from "@/lib/icons";
import { invalidateDomainCache, invalidateSiteCache } from "@/lib/invalidation";
import { keys } from "@/lib/keys";
import type { DomainMapping } from "@/lib/lifecycle";
import { extractSearchEntry } from "@/lib/markdown";
import { flattenNav } from "@/lib/nav";
import { isReservedHandle, isValidHandle, isValidHost, ROOT_DOMAIN } from "@/lib/rules";
import { SAMPLE_NAV, SAMPLE_PAGES } from "@/lib/samples";
import { isExpired, type PageDoc, type SearchIndex, type SiteConfig } from "@/lib/site";
import { DEFAULT_THEME } from "@/lib/theme";

// Write operations. Except for public site creation, callers verify the site's edit token first.

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const EXPIRY_KEY_RE = /^expiry\/(\d+)_([a-z0-9-]+)$/;

function randomHandle() {
  return `try-${Array.from(randomBytes(6), (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

// Collisions between random handles are negligible, so check-then-write is enough
async function pickTempHandle() {
  for (let i = 0; i < 5; i++) {
    const handle = randomHandle();
    if (!(await readJSON(keys.site(handle)))) return handle;
  }
  throw new Error("Failed to pick a free handle");
}

export async function createSite(name: string, chosenHandle?: string) {
  if (chosenHandle && (!isValidHandle(chosenHandle) || isReservedHandle(chosenHandle))) {
    throw new UserError(
      "域名前缀需为 1 到 32 位小写字母、数字或连字符，不能使用保留名称",
      "The subdomain must be 1 to 32 lowercase letters, digits or hyphens, and cannot be a reserved name.",
    );
  }
  if (chosenHandle) {
    const existing = await readJSON<SiteConfig>(keys.site(chosenHandle));
    if (existing && !isExpired(existing)) {
      throw new UserError("这个域名前缀已被占用，请换一个", "This subdomain is already taken. Please choose another.");
    }
    if (existing) await deleteSite(chosenHandle);
  }
  await cleanupTempSites();
  const handle = chosenHandle || (await pickTempHandle());

  const now = Date.now();
  const site: SiteConfig = {
    handle,
    name,
    description: "",
    icon: DEFAULT_ICON,
    theme: DEFAULT_THEME,
    domains: [],
    nav: structuredClone(SAMPLE_NAV),
    createdAt: now,
    expiresAt: now + TEMP_SITE_TTL_MS,
    version: 1,
  };

  const token = createToken();
  const index: SearchIndex = {};
  const pageWrites = Object.entries(SAMPLE_PAGES).map(([slug, markdown]) => {
    index[slug] = extractSearchEntry(markdown);
    const doc: PageDoc = { markdown, description: "", updatedAt: now };
    return writeJSON(keys.page(handle, slug), doc);
  });
  // Write the expiry marker first so leftovers from a failed creation get cleaned up; site.json goes last, and the site exists only once it is written
  await Promise.all([
    ...pageWrites,
    writeJSON(keys.search(handle), index),
    writeJSON(keys.auth(handle), { tokenHash: hashToken(token) }),
    site.expiresAt ? writeJSON(keys.expiry(site.expiresAt, handle), {}) : null,
  ]);
  await writeJSON(keys.site(handle), site);

  invalidateSiteCache(handle, site.domains, true);
  await grantSiteAccess(site, token);
  return handle;
}

// Clean up during visitor site creation: delete expired sites first, then the earliest-expiring ones until temporary sites are under the limit
async function cleanupTempSites() {
  const entries = (await listKeys("expiry/"))
    .map((key) => {
      const match = EXPIRY_KEY_RE.exec(key);
      return match ? { key, expiresAt: Number(match[1]), handle: match[2] } : null;
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  const now = Date.now();
  const expired = entries.filter((entry) => entry.expiresAt <= now).length;
  const overflow = Math.max(0, entries.length - expired - (MAX_TEMP_SITES - 1));
  const victims = entries.slice(0, Math.min(expired + overflow, MAX_CLEANUP_PER_RUN));
  await Promise.all(victims.map((entry) => deleteSite(entry.handle, entry.key)));
}

export async function deleteSite(handle: string, expiryKey?: string) {
  const [site, objects] = await Promise.all([
    readJSON<SiteConfig>(keys.site(handle)),
    listKeys(keys.siteDir(handle)),
  ]);
  if (expiryKey && site && expiryKey !== keys.expiry(site.expiresAt ?? 0, handle)) {
    await remove(expiryKey);
    return;
  }
  const markers = new Set([expiryKey, site?.expiresAt && keys.expiry(site.expiresAt, handle)]);
  try {
    const results = await Promise.allSettled([
      ...objects.map(remove),
      ...(site?.domains ?? []).map((host) => removeOwnedDomain(site!, host)),
      ...[...markers].filter((key) => typeof key === "string").map(remove),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  } finally {
    invalidateSiteCache(handle, site?.domains ?? [], true);
  }
}

// All site.json updates go through here. When version is not null, reject the write if it doesn't match the stored version
export async function updateSite(handle: string, version: number | null, mutate: (site: SiteConfig) => void) {
  const site = await readJSON<SiteConfig>(keys.site(handle));
  if (!site || isExpired(site)) throw new UserError("站点不存在或已过期");
  if (version !== null && site.version !== version) {
    throw new UserError("站点已在别处修改，请刷新页面后重试");
  }
  const domains = [...site.domains];
  mutate(site);
  site.version += 1;
  await writeJSON(keys.site(handle), site);
  invalidateSiteCache(handle, [...domains, ...site.domains]);
  return site;
}

async function removeOwnedDomain(site: SiteConfig, host: string) {
  const mapping = await readJSON<DomainMapping>(keys.domain(host));
  if (mapping?.handle === site.handle && (mapping.siteCreatedAt === undefined || mapping.siteCreatedAt === site.createdAt)) {
    await remove(keys.domain(host));
  }
  invalidateDomainCache(host);
}

function checkDomain(host: string) {
  if (!isValidHost(host)) throw new UserError("域名格式不对，例如 docs.example.com，请勿填写协议、端口或路径");
  if (host === ROOT_DOMAIN || (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`))) {
    throw new UserError("平台域名下的地址不用登记");
  }
}

export async function addSiteDomain(handle: string, version: number, host: string) {
  checkDomain(host);
  const site = await readJSON<SiteConfig>(keys.site(handle));
  if (!site || isExpired(site)) throw new UserError("站点不存在或已过期");
  if (site.version !== version) throw new UserError("站点已在别处修改，请刷新页面后重试");
  if (site.domains.includes(host)) throw new UserError("这个域名已登记到当前站点");
  const existing = await readJSON<DomainMapping>(keys.domain(host));
  if (existing) {
    const owner = await readJSON<SiteConfig>(keys.site(existing.handle));
    if (owner && !isExpired(owner) && (existing.siteCreatedAt === undefined || existing.siteCreatedAt === owner.createdAt)) {
      throw new UserError("这个域名已被占用，请先在原站点移除");
    }
  }

  await writeJSON(keys.domain(host), { handle, siteCreatedAt: site.createdAt } satisfies DomainMapping);
  let updated: SiteConfig;
  try {
    updated = await updateSite(handle, version, (draft) => {
      draft.domains.push(host);
    });
  } catch (error) {
    await removeOwnedDomain(site, host);
    throw error;
  }
  invalidateDomainCache(host);
  return updated;
}

export async function removeSiteDomain(handle: string, version: number, host: string) {
  checkDomain(host);
  const site = await updateSite(handle, version, (draft) => {
    if (!draft.domains.includes(host)) throw new UserError("这个域名不属于当前站点");
    draft.domains = draft.domains.filter((domain) => domain !== host);
  });
  await removeOwnedDomain(site, host);
  return site;
}

export async function updateSearchEntry(handle: string, slug: string, markdown: string) {
  const index = (await readJSON<SearchIndex>(keys.search(handle))) ?? {};
  index[slug] = extractSearchEntry(markdown);
  await writeJSON(keys.search(handle), index);
}

export async function removeSearchEntry(handle: string, slug: string) {
  const index = (await readJSON<SearchIndex>(keys.search(handle))) ?? {};
  delete index[slug];
  await writeJSON(keys.search(handle), index);
}

// The index and content are written separately and can drift after a failure; this rebuilds the index from the nav
export async function rebuildSearchIndex(site: SiteConfig) {
  const pages = flattenNav(site.nav);
  const docs = await Promise.all(pages.map((page) => readJSON<PageDoc>(keys.page(site.handle, page.slug))));
  const index: SearchIndex = {};
  pages.forEach((page, i) => {
    const doc = docs[i];
    if (doc) index[page.slug] = extractSearchEntry(doc.markdown);
  });
  await writeJSON(keys.search(site.handle), index);
}

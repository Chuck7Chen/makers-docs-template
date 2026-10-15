import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { createToken, grantSiteAccess, hashToken } from "@/lib/access";
import { listKeys, readJSON, remove, writeBytes, writeJSON } from "@/lib/blob";
import { MAX_CLEANUP_PER_RUN, MAX_IMAGE_BYTES, MAX_TEMP_SITES, TEMP_SITE_TTL_MS } from "@/lib/demo";
import { UserError } from "@/lib/forms";
import { DEFAULT_ICON } from "@/lib/icons";
import { extractSearchEntry } from "@/lib/markdown";
import { flattenNav } from "@/lib/nav";
import { SAMPLE_NAV, SAMPLE_PAGES } from "@/lib/samples";
import { IMAGE_FILE_RE, isExpired, keys, type PageDoc, type SearchIndex, type SiteConfig } from "@/lib/site";
import { DEFAULT_THEME } from "@/lib/theme";

// 写操作。调用方负责鉴权：站点操作先 requireSiteAccess，运营操作先 requireOperator

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const EXPIRY_KEY_RE = /^expiry\/(\d+)_([a-z0-9-]+)$/;

function randomHandle() {
  return `try-${Array.from(randomBytes(6), (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

// 随机 handle 撞上的概率可以忽略，先查再写即可
async function pickTempHandle() {
  for (let i = 0; i < 5; i++) {
    const handle = randomHandle();
    if (!(await readJSON(keys.site(handle)))) return handle;
  }
  throw new Error("Failed to pick a free handle");
}

// 不传 handle 就是访客建的临时站点
export async function createSite(name: string, chosenHandle?: string) {
  const temporary = !chosenHandle;
  let handle: string;
  if (chosenHandle) {
    if (await readJSON(keys.site(chosenHandle))) throw new UserError("这个子域名已被占用");
    handle = chosenHandle;
  } else {
    await cleanupTempSites();
    handle = await pickTempHandle();
  }

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
    version: 1,
  };
  if (temporary) site.expiresAt = now + TEMP_SITE_TTL_MS;

  const token = createToken();
  const index: SearchIndex = {};
  const pageWrites = Object.entries(SAMPLE_PAGES).map(([slug, markdown]) => {
    index[slug] = extractSearchEntry(markdown);
    const doc: PageDoc = { markdown, description: "", updatedAt: now };
    return writeJSON(keys.page(handle, slug), doc);
  });
  // 过期标记先写，中途失败留下的残片也会被清理；site.json 最后写，写完站点才算存在
  await Promise.all([
    ...pageWrites,
    writeJSON(keys.search(handle), index),
    writeJSON(keys.auth(handle), { tokenHash: hashToken(token) }),
    site.expiresAt ? writeJSON(keys.expiry(site.expiresAt, handle), {}) : null,
  ]);
  await writeJSON(keys.site(handle), site);

  await grantSiteAccess(site, token);
  revalidateTag(`site:${handle}`);
  return handle;
}

// 访客建站时顺带清理：先删过期的，再按到期时间从早到晚删，直到临时站点少于上限
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
  const domains = site?.domains ?? [];
  const markers = new Set([expiryKey, site?.expiresAt && keys.expiry(site.expiresAt, handle)]);
  await Promise.all([
    ...objects.map(remove),
    ...domains.map((host) => remove(keys.domain(host))),
    ...[...markers].filter((key) => typeof key === "string").map(remove),
  ]);
  revalidateTag(`site:${handle}`);
  revalidateTag(`search:${handle}`);
  for (const host of domains) revalidateTag(`domain:${host}`);
}

// 改 site.json 统一走这里。version 不为 null 时做并发检查：表单里带的版本号和存储里的不一致就拒绝
export async function updateSite(handle: string, version: number | null, mutate: (site: SiteConfig) => void) {
  const site = await readJSON<SiteConfig>(keys.site(handle));
  if (!site || isExpired(site)) throw new UserError("站点不存在或已过期");
  if (version !== null && site.version !== version) {
    throw new UserError("站点已在别处修改，请刷新页面后重试");
  }
  mutate(site);
  site.version += 1;
  await writeJSON(keys.site(handle), site);
  revalidateTag(`site:${handle}`);
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

// 索引和正文分开写，中途失败会不一致，用这个按导航重建
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

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

// 按文件头判断类型，不信任文件名和浏览器给的 MIME；不收 SVG
function detectImageType(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  return null;
}

export async function storeImage(handle: string, file: File) {
  if (file.size === 0) throw new UserError("请选择图片");
  if (file.size > MAX_IMAGE_BYTES) throw new UserError(`图片不能超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
  const data = await file.arrayBuffer();
  const ext = detectImageType(new Uint8Array(data, 0, Math.min(12, data.byteLength)));
  if (!ext) throw new UserError("只支持 PNG、JPEG、GIF 和 WebP 图片");
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeBytes(keys.asset(handle, name), data);
  return `/assets/${handle}/${name}`;
}

export async function removeImage(handle: string, url: string) {
  const prefix = `/assets/${handle}/`;
  const file = url.slice(prefix.length);
  if (url.startsWith(prefix) && IMAGE_FILE_RE.test(file)) await remove(keys.asset(handle, file));
}

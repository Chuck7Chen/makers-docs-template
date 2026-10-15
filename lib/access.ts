import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readJSON } from "@/lib/blob";
import { UserError } from "@/lib/forms";
import { isValidHandle } from "@/lib/rules";
import { isExpired, keys, loadSite, type SiteConfig } from "@/lib/site";

// 编辑令牌只存在浏览器的 Cookie 里，Blob 里只存它的哈希

const COOKIE_PREFIX = "edit_";
const ONE_YEAR = 365 * 24 * 60 * 60;

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hasSiteAccess(handle: string) {
  if (!isValidHandle(handle)) return false;
  const token = (await cookies()).get(COOKIE_PREFIX + handle)?.value;
  if (!token) return false;
  const auth = await readJSON<{ tokenHash: string }>(keys.auth(handle));
  return !!auth && sameHash(hashToken(token), auth.tokenHash);
}

export async function requireSiteAccess(handle: string) {
  if (!(await hasSiteAccess(handle))) throw new Error("Forbidden");
}

export async function requireEditableSite(handle: string): Promise<SiteConfig> {
  await requireSiteAccess(handle);
  const site = await loadSite(handle);
  if (!site || isExpired(site)) throw new UserError("站点不存在或已过期");
  return site;
}

// 临时站点的 Cookie 随站点一起过期；运营者建的站长期保留，Cookie 有效期一年
export async function grantSiteAccess(site: SiteConfig, token: string) {
  const maxAge = site.expiresAt ? Math.ceil((site.expiresAt - Date.now()) / 1000) : ONE_YEAR;
  (await cookies()).set(COOKIE_PREFIX + site.handle, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function revokeSiteAccess(handle: string) {
  (await cookies()).delete(COOKIE_PREFIX + handle);
}

// 当前浏览器能编辑的站点，只看 Cookie，调用方再逐个读站点配置
export async function accessibleHandles() {
  return (await cookies())
    .getAll()
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => cookie.name.slice(COOKIE_PREFIX.length))
    .filter(isValidHandle);
}

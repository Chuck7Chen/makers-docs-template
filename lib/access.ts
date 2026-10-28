import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { readJSON } from "@/lib/blob";
import { UserError } from "@/lib/forms";
import { isValidHandle } from "@/lib/rules";
import { keys } from "@/lib/keys";
import { isExpired, loadSite, type SiteConfig } from "@/lib/site";

// The edit token lives only in a browser cookie; Blob stores just its hash

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
  // Read both files at once; the config is only returned after the token checks out
  const [allowed, site] = await Promise.all([hasSiteAccess(handle), isValidHandle(handle) ? loadSite(handle) : null]);
  if (!allowed) throw new Error("Forbidden");
  if (!site || isExpired(site)) throw new UserError("站点不存在或已过期");
  return site;
}

// For admin pages: each page checks access itself instead of trusting the [site] layout, because client-side
// navigation only renders the segments that change and the layout's check doesn't run again. Shared per request
export const loadEditableSite = cache(async (handle: string) => {
  if (!isValidHandle(handle)) return null;
  const [allowed, site] = await Promise.all([hasSiteAccess(handle), loadSite(handle)]);
  return allowed && site && !isExpired(site) ? site : null;
});

// Demo site cookies expire with the site; existing sites without an expiry keep a one-year cookie
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

// Sites this browser can edit, based on cookies only; callers then load each site's config
export async function accessibleHandles() {
  return (await cookies())
    .getAll()
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => cookie.name.slice(COOKIE_PREFIX.length))
    .filter(isValidHandle);
}

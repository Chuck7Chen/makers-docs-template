"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { hasSiteAccess, requireEditableSite, requireSiteAccess, revokeSiteAccess } from "@/lib/access";
import { remove, writeJSON } from "@/lib/blob";
import { MAX_PAGE_BYTES, MAX_PAGES_PER_TEMP_SITE } from "@/lib/demo";
import { field, messageOf, UserError } from "@/lib/forms";
import { isIconName } from "@/lib/icons";
import { invalidatePageCache } from "@/lib/invalidation";
import { keys } from "@/lib/keys";
import {
  addSiteDomain,
  createSite,
  deleteSite,
  rebuildSearchIndex,
  removeSiteDomain,
  removeSearchEntry,
  updateSearchEntry,
  updateSite,
} from "@/lib/manage";
import { renderMarkdown } from "@/lib/markdown";
import { applyNavOp, findNavGroup, findNavPage, flattenNav, isGroup, type NavItem, type NavOp } from "@/lib/nav";
import { isValidDescription, isValidName, isValidSlug, isValidTitle } from "@/lib/rules";
import { isTemporary, type PageDoc, type SiteConfig } from "@/lib/site";
import { isThemeName } from "@/lib/theme";

// Every Action is a public endpoint, so it checks the edit token first

export type FormState = { error?: string };
export type SaveState = { error?: string; savedAt?: number; version: number };
export type SettingsResult = { error?: string; message?: string; site?: SiteConfig };

function withError(path: string, error?: string) {
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function checkPageSize(site: SiteConfig, markdown: string) {
  if (isTemporary(site) && Buffer.byteLength(markdown) > MAX_PAGE_BYTES) {
    throw new UserError(`体验站点每页正文最多 ${MAX_PAGE_BYTES / 1024} KB`);
  }
}

export async function createSiteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = field(formData, "name");
  const english = field(formData, "language") === "en";
  const chosenHandle = field(formData, "handle").toLowerCase();
  if (!isValidName(name)) return { error: english ? "Site name must be 1 to 40 characters." : "站点名称需要 1 到 40 个字" };
  let handle: string;
  try {
    handle = await createSite(name, chosenHandle || undefined);
  } catch (error) {
    return { error: messageOf(error, english) };
  }
  redirect(`/admin/${handle}`);
}

// Navigation

const NAV_OPS = new Set(["rename", "up", "down", "delete", "move", "add-group"]);

// Arguments come from the client: only read the fields we need and treat non-strings as empty strings
function parseNavOp(input: unknown): NavOp {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const text = (key: string) => {
    const raw = value[key];
    return typeof raw === "string" ? raw.trim() : "";
  };
  const op = text("op");
  if (!NAV_OPS.has(op)) throw new UserError("未知操作");
  return { op, pos: text("pos"), title: text("title"), target: text("target") } as NavOp;
}

export async function navAction(handle: string, version: number, input: NavOp): Promise<FormState> {
  if (!(await hasSiteAccess(handle))) return { error: "没有这个站点的编辑权限，请刷新页面" };
  let error: string | undefined;
  try {
    const op = parseNavOp(input);
    let removed = undefined as NavItem | undefined;
    const updated = await updateSite(handle, Number(version), (site) => {
      removed = applyNavOp(site.nav, op);
    });
    if (removed && !isGroup(removed)) {
      const { slug } = removed;
      try {
        const results = await Promise.allSettled([remove(keys.page(handle, slug)), removeSearchEntry(handle, slug)]);
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      } finally {
        invalidatePageCache(handle, slug, updated.domains);
      }
    }
  } catch (e) {
    error = messageOf(e);
  }
  // A failure usually means the site was changed elsewhere; revalidate anyway so the page gets the latest nav and version
  revalidatePath(`/admin/${handle}`);
  return { error };
}

export async function createPageAction(formData: FormData): Promise<FormState> {
  const handle = field(formData, "handle");
  const slug = field(formData, "slug").toLowerCase().replace(/^\/+|\/+$/g, "");
  try {
    const site = await requireEditableSite(handle);
    const title = field(formData, "title");
    const group = field(formData, "group");
    if (!isValidTitle(title)) throw new UserError("页面标题需要 1 到 60 个字");
    if (!isValidSlug(slug)) {
      throw new UserError("地址只能用小写字母、数字和连字符，最多三段，例如 guide/install");
    }
    const pages = flattenNav(site.nav);
    if (pages.some((page) => page.slug === slug)) throw new UserError("这个地址已经有页面了");
    if (isTemporary(site) && pages.length >= MAX_PAGES_PER_TEMP_SITE) {
      throw new UserError(`体验站点最多 ${MAX_PAGES_PER_TEMP_SITE} 页`);
    }

    // Write the content before updating the nav, so every page in the nav always has content
    const markdown = "在这里开始写作。\n";
    const doc: PageDoc = { markdown, description: "", updatedAt: Date.now() };
    await writeJSON(keys.page(handle, slug), doc);
    try {
      await updateSite(handle, Number(field(formData, "version")), (draft) => {
        const target = findNavGroup(draft.nav, group);
        (target ? target.pages : draft.nav).push({ title, slug });
      });
      await updateSearchEntry(handle, slug, markdown);
    } finally {
      invalidatePageCache(handle, slug, site.domains);
    }
  } catch (e) {
    return { error: messageOf(e) };
  }
  redirect(`/admin/${handle}/edit/${slug}`);
}

// Editor

export async function savePageAction(prev: SaveState, formData: FormData): Promise<SaveState> {
  const handle = field(formData, "handle");
  const slug = field(formData, "slug");
  const title = field(formData, "title");
  const description = field(formData, "description");
  const markdown = String(formData.get("markdown") ?? "");
  try {
    const site = await requireEditableSite(handle);
    const page = findNavPage(site.nav, slug);
    if (!page) throw new UserError("页面不存在，可能已被删除");
    if (!isValidTitle(title)) throw new UserError("标题需要 1 到 60 个字");
    if (!isValidDescription(description)) throw new UserError("简介最多 200 个字");
    checkPageSize(site, markdown);
    // Titles live in the nav, so site.json is only touched when the title changes; check the version first and skip the content write on conflict
    const version = Number(field(formData, "version"));
    const titleChanged = title !== page.title;
    if (titleChanged && version !== site.version) {
      throw new UserError("站点已在别处修改，请刷新页面后重试");
    }

    const doc: PageDoc = { markdown, description, updatedAt: Date.now() };
    await writeJSON(keys.page(handle, slug), doc);
    try {
      await updateSearchEntry(handle, slug, markdown);
      let nextVersion = site.version;
      if (titleChanged) {
        const updated = await updateSite(handle, version, (draft) => {
          const target = findNavPage(draft.nav, slug);
          if (target) target.title = title;
        });
        nextVersion = updated.version;
      }
      return { savedAt: Date.now(), version: nextVersion };
    } finally {
      invalidatePageCache(handle, slug, site.domains);
    }
  } catch (e) {
    return { ...prev, error: messageOf(e), savedAt: undefined };
  }
}

export async function previewAction(handle: string, markdown: string): Promise<{ html?: string; error?: string }> {
  try {
    const site = await requireEditableSite(handle);
    checkPageSize(site, markdown);
    return { html: renderMarkdown(markdown).html };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

// Settings

export async function appearanceAction(formData: FormData): Promise<SettingsResult> {
  const handle = field(formData, "handle");
  let updated: SiteConfig | undefined;
  try {
    await requireEditableSite(handle);
    const name = field(formData, "name");
    const description = field(formData, "description");
    const icon = field(formData, "icon");
    const theme = field(formData, "theme");
    if (!isValidName(name)) throw new UserError("站点名称需要 1 到 40 个字");
    if (!isValidDescription(description)) throw new UserError("简介最多 200 个字");
    if (!isIconName(icon)) throw new UserError("请从列表里选择图标");
    if (!isThemeName(theme)) throw new UserError("请从列表里选择主题");

    updated = await updateSite(handle, Number(field(formData, "version")), (draft) => {
      Object.assign(draft, { name, description, icon, theme });
      // Logos are no longer supported; drop any left over from older data
      delete draft.logo;
    });
    return { site: updated, message: "外观已保存" };
  } catch (e) {
    return { error: messageOf(e), site: updated };
  }
}

export async function rebuildSearchAction(formData: FormData): Promise<SettingsResult> {
  const handle = field(formData, "handle");
  try {
    await rebuildSearchIndex(await requireEditableSite(handle));
    revalidateTag(`search:${handle}`);
    return { message: "搜索索引已重建" };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

export async function addDomainAction(formData: FormData): Promise<SettingsResult> {
  const handle = field(formData, "handle");
  try {
    await requireEditableSite(handle);
    const host = field(formData, "host").toLowerCase().replace(/\.$/, "");
    const site = await addSiteDomain(handle, Number(field(formData, "version")), host);
    return { site, message: "自定义域名已登记" };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

export async function removeDomainAction(formData: FormData): Promise<SettingsResult> {
  const handle = field(formData, "handle");
  try {
    await requireEditableSite(handle);
    const host = field(formData, "host").toLowerCase().replace(/\.$/, "");
    const site = await removeSiteDomain(handle, Number(field(formData, "version")), host);
    return { site, message: "自定义域名已移除" };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

export async function deleteSiteAction(formData: FormData) {
  const handle = field(formData, "handle");
  let error: string | undefined;
  try {
    await requireSiteAccess(handle);
    await deleteSite(handle);
    await revokeSiteAccess(handle);
  } catch (e) {
    error = messageOf(e);
  }
  redirect(error ? withError(`/admin/${handle}/settings`, error) : "/admin");
}

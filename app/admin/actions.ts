"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { hasSiteAccess, requireEditableSite, requireSiteAccess, revokeSiteAccess } from "@/lib/access";
import { remove, writeJSON } from "@/lib/blob";
import { MAX_PAGE_BYTES, MAX_PAGES_PER_TEMP_SITE } from "@/lib/demo";
import { field, messageOf, UserError } from "@/lib/forms";
import { isIconName } from "@/lib/icons";
import {
  createSite,
  deleteSite,
  rebuildSearchIndex,
  removeImage,
  removeSearchEntry,
  storeImage,
  updateSearchEntry,
  updateSite,
} from "@/lib/manage";
import { renderMarkdown } from "@/lib/markdown";
import { applyNavOp, findNavGroup, findNavPage, flattenNav, isGroup, type NavItem, type NavOp } from "@/lib/nav";
import { isValidDescription, isValidName, isValidSlug, isValidTitle } from "@/lib/rules";
import { isTemporary, keys, type PageDoc, type SiteConfig } from "@/lib/site";
import { isThemeName } from "@/lib/theme";

// 每个 Action 都是公开端点，开头先校验编辑令牌

export type FormState = { error?: string };
export type SaveState = { error?: string; savedAt?: number; version: number };

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
  if (!isValidName(name)) return { error: english ? "Site name must be 1 to 40 characters." : "站点名称需要 1 到 40 个字" };
  let handle: string;
  try {
    handle = await createSite(name);
  } catch (error) {
    return { error: messageOf(error) };
  }
  redirect(`/admin/${handle}`);
}

// 导航

const NAV_OPS = new Set(["rename", "up", "down", "delete", "move", "add-group"]);

// 参数来自客户端，只取用得到的字段，不是字符串的按空字符串处理
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
    await updateSite(handle, Number(version), (site) => {
      removed = applyNavOp(site.nav, op);
    });
    if (removed && !isGroup(removed)) {
      const { slug } = removed;
      await Promise.all([remove(keys.page(handle, slug)), removeSearchEntry(handle, slug)]);
      revalidateTag(`page:${handle}:${slug}`);
      revalidateTag(`search:${handle}`);
    }
  } catch (e) {
    error = messageOf(e);
  }
  // 失败多半是站点在别处改过，也刷新一次，页面拿到最新的导航和版本号
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

    // 先写正文再改导航，导航里的页面总有正文
    const markdown = "在这里开始写作。\n";
    const doc: PageDoc = { markdown, description: "", updatedAt: Date.now() };
    await writeJSON(keys.page(handle, slug), doc);
    await updateSite(handle, Number(field(formData, "version")), (draft) => {
      const target = findNavGroup(draft.nav, group);
      (target ? target.pages : draft.nav).push({ title, slug });
    });
    await updateSearchEntry(handle, slug, markdown);
    revalidateTag(`page:${handle}:${slug}`);
    revalidateTag(`search:${handle}`);
  } catch (e) {
    return { error: messageOf(e) };
  }
  redirect(`/admin/${handle}/edit/${slug}`);
}

// 编辑器

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
    // 标题存在导航里，改了才需要动 site.json；先查版本，冲突时正文也不写
    const version = Number(field(formData, "version"));
    const titleChanged = title !== page.title;
    if (titleChanged && version !== site.version) {
      throw new UserError("站点已在别处修改，请刷新页面后重试");
    }

    const doc: PageDoc = { markdown, description, updatedAt: Date.now() };
    await writeJSON(keys.page(handle, slug), doc);
    await updateSearchEntry(handle, slug, markdown);
    revalidateTag(`page:${handle}:${slug}`);
    revalidateTag(`search:${handle}`);

    let nextVersion = site.version;
    if (titleChanged) {
      const updated = await updateSite(handle, version, (draft) => {
        const target = findNavPage(draft.nav, slug);
        if (target) target.title = title;
      });
      nextVersion = updated.version;
    }
    return { savedAt: Date.now(), version: nextVersion };
  } catch (e) {
    return { ...prev, error: messageOf(e), savedAt: undefined };
  }
}

export async function previewAction(handle: string, markdown: string): Promise<{ html?: string; error?: string }> {
  try {
    const site = await requireEditableSite(handle);
    checkPageSize(site, markdown);
    return { html: renderMarkdown(markdown, handle).html };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

export async function uploadImageAction(handle: string, formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    const site = await requireEditableSite(handle);
    if (isTemporary(site)) throw new UserError("体验站点不能上传图片");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new UserError("请选择图片");
    return { url: await storeImage(handle, file) };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

// 设置

export async function appearanceAction(formData: FormData) {
  const handle = field(formData, "handle");
  let error: string | undefined;
  try {
    const site = await requireEditableSite(handle);
    const name = field(formData, "name");
    const description = field(formData, "description");
    const icon = field(formData, "icon");
    const theme = field(formData, "theme");
    if (!isValidName(name)) throw new UserError("站点名称需要 1 到 40 个字");
    if (!isValidDescription(description)) throw new UserError("简介最多 200 个字");
    if (!isIconName(icon)) throw new UserError("请从列表里选择图标");
    if (!isThemeName(theme)) throw new UserError("请从列表里选择主题");

    let logo = site.logo;
    const file = formData.get("logo");
    if (file instanceof File && file.size > 0) {
      if (isTemporary(site)) throw new UserError("体验站点不能上传 logo");
      logo = await storeImage(handle, file);
    } else if (formData.get("removeLogo") === "on") {
      logo = undefined;
    }

    await updateSite(handle, Number(field(formData, "version")), (draft) => {
      Object.assign(draft, { name, description, icon, theme });
      if (logo) draft.logo = logo;
      else delete draft.logo;
    });
    if (site.logo && site.logo !== logo) await removeImage(handle, site.logo);
  } catch (e) {
    error = messageOf(e);
  }
  redirect(error ? withError(`/admin/${handle}/settings`, error) : `/admin/${handle}/settings?saved=1`);
}

export async function rebuildSearchAction(formData: FormData) {
  const handle = field(formData, "handle");
  let error: string | undefined;
  try {
    await rebuildSearchIndex(await requireEditableSite(handle));
    revalidateTag(`search:${handle}`);
  } catch (e) {
    error = messageOf(e);
  }
  redirect(error ? withError(`/admin/${handle}/settings`, error) : `/admin/${handle}/settings?rebuilt=1`);
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

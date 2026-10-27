import { UserError } from "@/lib/forms";
import { isValidTitle } from "@/lib/rules";

// Admin client components import this file too, so it must not depend on server APIs

export type NavPage = { title: string; slug: string };
export type NavGroup = { title: string; pages: NavPage[] };
export type NavItem = NavPage | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return "pages" in item;
}

export function flattenNav(nav: NavItem[]): NavPage[] {
  return nav.flatMap((item) => (isGroup(item) ? item.pages : [item]));
}

export function findNavPage(nav: NavItem[], slug: string) {
  return flattenNav(nav).find((page) => page.slug === slug);
}

export function pagePath(slug: string) {
  return slug === "index" ? "/" : `/${slug}`;
}

// pos is a nav item's position: "2" at the top level, "2.0" for a page in a group. target is a group's position; an empty string means the top level
export type NavOp =
  | { op: "rename"; pos: string; title: string }
  | { op: "up" | "down" | "delete"; pos: string }
  | { op: "move"; pos: string; target: string }
  | { op: "add-group"; title: string };

function locate(nav: NavItem[], pos: string) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(pos);
  const top = match ? nav[Number(match[1])] : undefined;
  if (!match || !top) throw new UserError("导航项不存在，请刷新页面后重试");
  if (match[2] === undefined) return { list: nav, index: Number(match[1]), item: top };
  const index = Number(match[2]);
  if (!isGroup(top) || !top.pages[index]) throw new UserError("导航项不存在，请刷新页面后重试");
  return { list: top.pages as NavItem[], index, item: top.pages[index] as NavItem };
}

export function findNavGroup(nav: NavItem[], target: string) {
  if (target === "") return null;
  const group = /^\d+$/.test(target) ? nav[Number(target)] : undefined;
  if (!group || !isGroup(group)) throw new UserError("分组不存在，请刷新页面后重试");
  return group;
}

// Mutates the nav in place and returns the removed item on delete. Called by the server before saving; the admin UI also uses it to update optimistically
export function applyNavOp(nav: NavItem[], op: NavOp): NavItem | undefined {
  if (op.op === "add-group") {
    if (!isValidTitle(op.title)) throw new UserError("分组名需要 1 到 60 个字");
    nav.push({ title: op.title, pages: [] });
    return;
  }

  const { list, index, item } = locate(nav, op.pos);
  if (op.op === "rename") {
    if (!isValidTitle(op.title)) throw new UserError("标题需要 1 到 60 个字");
    item.title = op.title;
  } else if (op.op === "up" || op.op === "down") {
    const target = op.op === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
  } else if (op.op === "move") {
    if (isGroup(item)) throw new UserError("分组不能放进分组");
    const group = findNavGroup(nav, op.target);
    const dest: NavItem[] = group ? group.pages : nav;
    if (dest === list) return;
    list.splice(index, 1);
    dest.push(item);
  } else if (op.op === "delete") {
    if (isGroup(item) && item.pages.length > 0) throw new UserError("分组里还有页面，先移走或删除这些页面");
    if (!isGroup(item) && item.slug === "index") throw new UserError("首页不能删除");
    list.splice(index, 1);
    return item;
  } else {
    throw new UserError("未知操作");
  }
}

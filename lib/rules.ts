// 中间件也会引用这个文件，不能依赖 Node API

// 本地开发没配置时用 localhost，直接 npm run dev 就能用 {handle}.localhost 访问站点
export const ROOT_DOMAIN = (
  process.env.ROOT_DOMAIN || (process.env.NODE_ENV === "development" ? "localhost" : "")
).toLowerCase();

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const RESERVED_HANDLES = new Set(["www", "admin", "api", "app"]);
const HOST_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;

export function isValidHandle(value: string) {
  return HANDLE_RE.test(value);
}

export function isReservedHandle(value: string) {
  return RESERVED_HANDLES.has(value);
}

export function isValidSlug(slug: string) {
  const parts = slug.split("/");
  return parts.length <= 3 && parts[0] !== "assets" && parts.every((part) => HANDLE_RE.test(part));
}

export function isValidHost(value: string) {
  return HOST_RE.test(value);
}

function length(value: string) {
  return [...value].length;
}

export function isValidName(value: string) {
  return length(value) >= 1 && length(value) <= 40;
}

export function isValidTitle(value: string) {
  return length(value) >= 1 && length(value) <= 60;
}

export function isValidDescription(value: string) {
  return length(value) <= 200;
}

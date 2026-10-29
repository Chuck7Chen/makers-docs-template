// Middleware imports this file too, so it must not depend on Node APIs

// Defaults to localhost in local dev, so plain npm run dev serves sites at {handle}.localhost
export const ROOT_DOMAIN = (
  process.env.ROOT_DOMAIN || (process.env.NODE_ENV === "development" ? "localhost" : "")
).toLowerCase();

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

// Domains Makers assigns to the project itself (preview links, default domains). They serve the platform, never a
// tenant: there is no wildcard under them, so sites still live under ROOT_DOMAIN
const MAKERS_HOST_SUFFIXES = [".edgeone.cool", ".edgeone.app"];

export function isMakersHost(host: string) {
  return MAKERS_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

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
  return parts.length <= 3 && parts.every((part) => HANDLE_RE.test(part));
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

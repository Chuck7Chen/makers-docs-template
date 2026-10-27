import { revalidatePath, revalidateTag } from "next/cache";
import { isValidHandle, isValidHost, isValidSlug } from "@/lib/rules";

function identifiers(handle: string, domains: string[]) {
  if (!isValidHandle(handle)) throw new Error("Invalid cache handle");
  return [handle, ...new Set(domains.filter(isValidHost))];
}

export function invalidateSiteCache(handle: string, domains: string[] = [], contents = false) {
  for (const identifier of identifiers(handle, domains)) revalidatePath(`/s/${identifier}`, "layout");
  revalidateTag(`site:${handle}`);
  if (contents) {
    revalidateTag(`content:${handle}`);
    revalidateTag(`search:${handle}`);
  }
}

export function invalidatePageCache(handle: string, slug: string, domains: string[] = []) {
  if (!isValidSlug(slug)) throw new Error("Invalid cache slug");
  for (const identifier of identifiers(handle, domains)) {
    revalidatePath(`/s/${identifier}${slug === "index" ? "" : `/${slug}`}`);
  }
  revalidateTag(`page:${handle}:${slug}`);
  revalidateTag(`search:${handle}`);
}

export function invalidateDomainCache(host: string) {
  if (!isValidHost(host)) throw new Error("Invalid cache domain");
  revalidateTag(`domain:${host}`);
  revalidatePath(`/s/${host}`, "layout");
}

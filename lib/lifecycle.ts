import { readJSON } from "@/lib/blob";
import { isValidHandle, isValidHost } from "@/lib/rules";

export type LiveSite = {
  handle: string;
  createdAt: number;
  expiresAt?: number;
  domains: string[];
};

type Mapping = { handle: string; siteCreatedAt?: number };

export async function resolveLiveSite(identifier: string): Promise<LiveSite | null> {
  const domain = identifier.includes(".");
  if (domain ? !isValidHost(identifier) : !isValidHandle(identifier)) return null;
  const mapping = domain ? await readJSON<Mapping>(`domains/${identifier}.json`) : null;
  const handle = domain ? mapping?.handle : identifier;
  if (!handle || !isValidHandle(handle)) return null;
  const site = await readJSON<LiveSite>(`sites/${handle}/site.json`);
  if (!site || site.handle !== handle || !Number.isFinite(site.createdAt) || !Array.isArray(site.domains)) return null;
  if (site.expiresAt !== undefined && (!Number.isFinite(site.expiresAt) || site.expiresAt <= Date.now())) return null;
  if (domain && (!site.domains.includes(identifier) || (mapping?.siteCreatedAt !== undefined && mapping.siteCreatedAt !== site.createdAt))) {
    return null;
  }
  return site;
}

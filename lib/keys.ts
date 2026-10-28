// Blob keys. Middleware imports this file too, so it must not depend on Node APIs

export const keys = {
  site: (handle: string) => `sites/${handle}/site.json`,
  page: (handle: string, slug: string) => `sites/${handle}/pages/${slug}.json`,
  search: (handle: string) => `sites/${handle}/search.json`,
  auth: (handle: string) => `sites/${handle}/auth.json`,
  siteDir: (handle: string) => `sites/${handle}/`,
  domain: (host: string) => `domains/${host}.json`,
  expiry: (expiresAt: number, handle: string) => `expiry/${expiresAt}_${handle}`,
};

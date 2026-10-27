import { flattenNav, pagePath } from "@/lib/nav";
import { resolveSite, siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

// Domains and slugs are validated and never contain characters that need XML escaping
export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await resolveSite((await params).site);
  if (!site) return new Response("Not Found", { status: 404 });
  const origin = siteOrigin(site);
  const urls = flattenNav(site.nav)
    .map((page) => `  <url><loc>${origin}${pagePath(page.slug)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

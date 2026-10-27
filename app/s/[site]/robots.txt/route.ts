import { isTemporary, resolveSite, siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

// Keep temporary sites out of search engines
export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await resolveSite((await params).site);
  if (!site) return new Response("Not Found", { status: 404 });
  const body = isTemporary(site)
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin(site)}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

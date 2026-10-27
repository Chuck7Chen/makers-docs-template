import { flattenNav, pagePath } from "@/lib/nav";
import { getSearchIndex, resolveSite } from "@/lib/site";

export const dynamic = "force-dynamic";

// Titles come from the nav; the index only holds headings and body text
export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const site = await resolveSite((await params).site);
  if (!site) return new Response("Not Found", { status: 404 });
  const index = await getSearchIndex(site.handle);
  const pages = flattenNav(site.nav).map((page) => ({
    url: pagePath(page.slug),
    title: page.title,
    headings: index[page.slug]?.headings ?? [],
    text: index[page.slug]?.text ?? "",
  }));
  return Response.json({ pages });
}

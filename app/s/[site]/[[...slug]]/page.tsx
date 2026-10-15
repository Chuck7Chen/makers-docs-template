import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderMarkdown, type Heading } from "@/lib/markdown";
import { findNavPage, flattenNav, pagePath } from "@/lib/nav";
import { isValidSlug } from "@/lib/rules";
import { getPage, getSearchIndex, resolveSite, siteOrigin } from "@/lib/site";

type Props = { params: Promise<{ site: string; slug?: string[] }> };

// 构建时不生成任何页面，第一次访问时渲染并缓存；内容变化靠 revalidateTag，兜底一天
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

// 读取都经过带缓存的函数，generateMetadata 和页面各调一次也只读一次 Blob
async function load(params: Props["params"]) {
  const { site: param, slug: parts = [] } = await params;
  // Next 会把 /index 规范成 /，首页只有一个地址
  const slug = parts.length ? parts.join("/") : "index";
  if (!isValidSlug(slug)) return null;

  const site = await resolveSite(param);
  const navPage = site && findNavPage(site.nav, slug);
  if (!site || !navPage) return null;
  const doc = await getPage(site.handle, slug);
  return doc ? { site, slug, navPage, doc } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { site, slug, navPage, doc } = data;
  const excerpt = (await getSearchIndex(site.handle))[slug]?.text.slice(0, 120);
  return {
    title: slug === "index" ? { absolute: site.name } : navPage.title,
    description: doc.description || excerpt || site.description || undefined,
    alternates: { canonical: siteOrigin(site) + pagePath(slug) },
  };
}

function Toc({ headings }: { headings: Heading[] }) {
  return (
    <aside className="hidden w-52 shrink-0 xl:block">
      <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-10 text-sm">
        <p className="mb-3 font-semibold text-gray-900">本页目录</p>
        <ul className="space-y-2 border-l border-gray-200">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`-ml-px block border-l border-transparent text-gray-500 hover:border-gray-400 hover:text-gray-900 ${heading.depth === 3 ? "pl-6" : "pl-3"}`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default async function DocPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { site, slug, navPage, doc } = data;

  const { html, headings } = renderMarkdown(doc.markdown, site.handle);
  const pages = flattenNav(site.nav);
  const index = pages.findIndex((page) => page.slug === slug);
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const isHome = slug === "index";
  const lead = doc.description || (isHome ? site.description : "");

  return (
    <div className="flex gap-10">
      {/* 侧栏整站共用，当前页的高亮在这里按 slug 输出 */}
      <style>{`a[data-slug="${slug}"]{color:var(--brand-text);background:color-mix(in srgb,var(--brand) 10%,transparent);font-weight:600}`}</style>

      <article className="min-w-0 flex-1 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{isHome ? site.name : navPage.title}</h1>
        {lead ? <p className="mt-3 text-lg text-gray-500">{lead}</p> : null}
        <div className="doc mt-8" dangerouslySetInnerHTML={{ __html: html }} />

        {prev || next ? (
          <nav className="mt-16 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2">
            {prev ? (
              <a href={pagePath(prev.slug)} className="rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300">
                <span className="block text-xs text-gray-500">上一页</span>
                <span className="font-medium text-gray-900">{prev.title}</span>
              </a>
            ) : null}
            {next ? (
              <a
                href={pagePath(next.slug)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-right hover:border-gray-300 sm:col-start-2"
              >
                <span className="block text-xs text-gray-500">下一页</span>
                <span className="font-medium text-gray-900">{next.title}</span>
              </a>
            ) : null}
          </nav>
        ) : null}
      </article>

      {headings.length > 0 ? <Toc headings={headings} /> : null}
    </div>
  );
}

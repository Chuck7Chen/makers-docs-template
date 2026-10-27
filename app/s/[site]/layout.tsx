import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyCode } from "@/components/copy-code";
import { SiteMark } from "@/components/icon";
import { Search } from "@/components/search";
import { Sidebar } from "@/components/sidebar";
import { TEMP_SITE_TTL_HOURS } from "@/lib/demo";
import { faviconDataUri } from "@/lib/icons";
import { isTemporary, resolveSite } from "@/lib/site";
import { brandStyle } from "@/lib/theme";

export const revalidate = false;

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await resolveSite((await params).site);
  if (!site) return {};
  return {
    title: { default: site.name, template: `%s - ${site.name}` },
    description: site.description || undefined,
    icons: { icon: site.logo ?? faviconDataUri(site.icon, site.theme) },
    robots: isTemporary(site) ? { index: false, follow: false } : undefined,
  };
}

export default async function SiteLayout({ children, params }: Props & { children: ReactNode }) {
  const site = await resolveSite((await params).site);
  if (!site) notFound();

  return (
    <div style={brandStyle(site.theme)} className="min-h-screen">
      {isTemporary(site) ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          体验站点，内容由访客创建，{TEMP_SITE_TTL_HOURS} 小时后自动删除
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <a href="/" className="flex min-w-0 items-center gap-2.5 font-semibold text-gray-900">
            <SiteMark icon={site.icon} logo={site.logo} />
            <span className="truncate">{site.name}</span>
          </a>
          <div className="ml-auto">
            <Search />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-4 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2">
            <Sidebar nav={site.nav} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <details className="border-b border-gray-200 py-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">导航</summary>
            <div className="pt-3">
              <Sidebar nav={site.nav} />
            </div>
          </details>
          {children}
        </div>
      </div>

      <CopyCode />
    </div>
  );
}

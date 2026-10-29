import { ArrowRight, PanelsTopLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateSiteForm } from "@/components/create-site-form";
import { PlatformHeader, type Language } from "@/components/platform-header";
import { MAX_PAGES_PER_TEMP_SITE, TEMP_SITE_TTL_HOURS } from "@/lib/demo";

// Platform home, served at / and /en. Both are prerendered and cached at the edge, so nothing here may depend on
// the request or on runtime environment variables. Nor may it call a Server Action: an Action posts to the current
// page, and on Makers these pages are static files with no function behind them

const COPY = {
  zh: {
    eyebrow: "EDGEONE MAKERS · 多租户模板",
    headlinePrefix: "一次部署，",
    headlineAccent: "服务所有租户",
    description: "一套代码、一次部署，按域名服务任意数量的租户，数据天然隔离。适用于文档站、电商店铺、企业官网等场景，替换内置的文档站示例即可成为你的产品。",
    formTitle: "创建体验租户",
    formDescription: "每个租户对应一个独立的文档站，拥有独立的子域名、内容与主题，无需注册。",
    manage: "我的站点",
    manageDescription: "继续管理已创建的站点",
    limit: `仅当前浏览器可编辑，最多 ${MAX_PAGES_PER_TEMP_SITE} 页，${TEMP_SITE_TTL_HOURS} 小时后自动删除。`,
    features: [
      { title: "域名路由", text: "边缘中间件按域名识别租户，子域名开箱即用，也支持自有域名。" },
      { title: "数据隔离", text: "所有租户共用一份部署，内容、配置与缓存按租户隔离，互不干扰。" },
      { title: "即时发布", text: "内容保存后立即生效，只刷新当前租户的缓存，其他租户不受影响。" },
    ],
  },
  en: {
    eyebrow: "EDGEONE MAKERS · MULTI-TENANT TEMPLATE",
    headlinePrefix: "One deploy, ",
    headlineAccent: "every tenant",
    description: "One codebase, one deployment, any number of tenants routed by domain with built-in data isolation. For docs, e-commerce, portals and more — swap the included sample to build your own SaaS.",
    formTitle: "Create a demo tenant",
    formDescription: "Each tenant is a self-contained docs site with its own subdomain, content and theme. No sign-up required.",
    manage: "My sites",
    manageDescription: "Manage the sites you've created",
    limit: `Editable only in this browser. Up to ${MAX_PAGES_PER_TEMP_SITE} pages, deleted after ${TEMP_SITE_TTL_HOURS} hours.`,
    features: [
      { title: "Domain routing", text: "Edge middleware routes tenants by domain. Subdomains and custom domains both supported." },
      { title: "Data isolation", text: "All tenants share one deployment. Content, settings and cache are isolated per tenant." },
      { title: "Instant publishing", text: "Edits go live on save, invalidating only the affected tenant's cache; other tenants are untouched." },
    ],
  },
} as const;

export const HOME_METADATA: Record<Language, Metadata> = {
  zh: {
    title: "EdgeOne Makers 多租户模板",
    description: "基于 EdgeOne Makers 的多租户应用模板：一次部署，按域名服务所有租户。适合搭建电商店铺、企业官网、博客平台等独立站点，模板以文档站为示例。",
    keywords: ["EdgeOne Makers", "EdgeOne Pages", "Next.js", "多租户", "SaaS", "自定义域名", "边缘中间件"],
  },
  en: {
    title: "Multi-Tenant Template for EdgeOne Makers",
    description: "A multi-tenant app template for EdgeOne Makers: deploy once and serve every tenant by domain. Works for docs, e-commerce, portals and more.",
    keywords: ["EdgeOne Makers", "EdgeOne Pages", "Next.js", "multi-tenant", "SaaS", "custom domains", "edge middleware"],
  },
};

export function PlatformHome({ language }: { language: Language }) {
  const text = COPY[language];

  return (
    <div lang={language === "en" ? "en" : "zh-CN"} className="flex min-h-screen flex-col bg-white text-foreground">
      <PlatformHeader language={language} />
      <main className="relative flex flex-1 items-center overflow-hidden bg-linear-to-b from-[#f2f3ff] via-white to-white">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-72 opacity-45 [background-image:radial-gradient(#b5c7ff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <section className="relative mx-auto grid w-full max-w-6xl gap-x-20 gap-y-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="self-end">
            <p className="text-primary text-xs font-semibold tracking-[0.14em]">{text.eyebrow}</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance text-zinc-950 sm:text-5xl sm:leading-tight">
              {text.headlinePrefix}
              <span className="text-primary font-bold">{text.headlineAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">{text.description}</p>
          </div>

          <div id="create-site" className="scroll-mt-8 border-t pt-9 lg:row-span-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{text.formTitle}</h2>
              <p className="mt-1.5 text-sm text-zinc-500">{text.formDescription}</p>
            </div>

            <div className="mt-6">
              <CreateSiteForm language={language} />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-zinc-400">{text.limit}</p>

            {/* No viewport prefetch: the admin is rendered per request, and this page should cost no function call */}
            <Link
              href="/admin"
              prefetch={false}
              className="group mt-6 flex items-center gap-3 rounded-lg border border-primary/15 bg-white px-3.5 py-3 shadow-xs transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <PanelsTopLeft className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900">{text.manage}</span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{text.manageDescription}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid gap-5 self-start sm:grid-cols-3">
            {text.features.map((feature, index) => (
              <article key={feature.title} className="border-t border-zinc-200 pt-4">
                <span className="text-primary font-mono text-[10px] font-semibold">0{index + 1}</span>
                <h2 className="mt-2 text-xs font-semibold text-zinc-900">{feature.title}</h2>
                <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

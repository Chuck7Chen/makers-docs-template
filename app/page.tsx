import { ArrowRight, CircleAlert, PanelsTopLeft } from "lucide-react";
import type { Metadata } from "next";
import { CreateSiteForm } from "@/components/create-site-form";
import { PlatformHeader, type Language } from "@/components/platform-header";
import { MAX_PAGES_PER_TEMP_SITE, TEMP_SITE_TTL_HOURS } from "@/lib/demo";
import { ROOT_DOMAIN } from "@/lib/rules";

const COPY = {
  zh: {
    eyebrow: "EDGEONE MAKERS · 多租户模板",
    headlinePrefix: "一套代码，",
    headlineAccent: "服务多个",
    headlineSuffix: "文档站",
    description: "一次部署，按域名服务多个独立文档站。每个站点有独立的子域名、导航、内容和主题，还可以接入自有域名。",
    formTitle: "创建体验站点",
    formDescription: "无需注册，体验多租户建站与域名路由。站点 24 小时有效。",
    manage: "我的站点",
    manageDescription: "继续编辑已创建的站点",
    warning: "还没有配置 ROOT_DOMAIN，子域名站点暂时无法访问。",
    limit: `仅当前浏览器可编辑，最多 ${MAX_PAGES_PER_TEMP_SITE} 页，${TEMP_SITE_TTL_HOURS} 小时后自动删除。`,
    features: [
      { title: "按域名隔离租户", text: "子域名与自有域名自动识别站点，访问地址保持不变。" },
      { title: "共享代码一次部署", text: "一次部署服务多个租户，内容与配置独立存储、互不干扰。" },
      { title: "Markdown 即时发布", text: "Markdown 编写预览，保存即发布，缓存按页面自动刷新。" },
    ],
  },
  en: {
    eyebrow: "EDGEONE MAKERS · MULTI-TENANT TEMPLATE",
    headlinePrefix: "One codebase, ",
    headlineAccent: "many docs",
    headlineSuffix: "sites",
    description: "Deploy once, serve many docs sites by domain. Each site gets its own subdomain, navigation, content, theme, and optional custom domain.",
    formTitle: "Create a demo site",
    formDescription: "No sign-up required. Try multi-tenant site creation and routing. Sites expire after 24 hours.",
    manage: "My sites",
    manageDescription: "Continue editing your sites",
    warning: "ROOT_DOMAIN is not configured, so subdomain sites are currently unavailable.",
    limit: `Editable only in this browser. Up to ${MAX_PAGES_PER_TEMP_SITE} pages, deleted after ${TEMP_SITE_TTL_HOURS} hours.`,
    features: [
      { title: "Domain-based tenants", text: "Edge middleware resolves sites by Host. Subdomains and custom domains route automatically." },
      { title: "One shared deploy", text: "All tenants share a single Next.js project. Content, config, and search indexes are isolated by prefix in Blob storage." },
      { title: "Publish on save", text: "Write and preview Markdown in the admin panel. Cache is invalidated per page, per tenant — other sites are unaffected." },
    ],
  },
} as const;

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  return lang === "en"
    ? {
        title: "Multi-Tenant Docs Template",
        description: "A multi-tenant docs site template built on EdgeOne Makers. Deploy once, serve many tenants.",
        keywords: ["EdgeOne Makers", "EdgeOne Pages", "Next.js", "multi-tenant", "docs site", "custom domain", "middleware"],
      }
    : {
        title: "多租户文档站模板",
        description: "基于 EdgeOne Makers 的多租户文档站模板，一次部署按域名服务多个租户。",
        keywords: ["EdgeOne Makers", "EdgeOne Pages", "Next.js", "多租户", "文档站", "自定义域名", "中间件"],
      };
}

export default async function Home({ searchParams }: Props) {
  const query = await searchParams;
  const language: Language = query.lang === "en" ? "en" : "zh";
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
              {language === "en" ? " " : ""}
              {text.headlineSuffix}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">{text.description}</p>
          </div>

          <div id="create-site" className="scroll-mt-8 border-t pt-9 lg:row-span-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{text.formTitle}</h2>
              <p className="mt-1.5 text-sm text-zinc-500">{text.formDescription}</p>
            </div>

            {!ROOT_DOMAIN ? (
              <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <CircleAlert className="size-3.5 shrink-0" />
                <p>{text.warning}</p>
              </div>
            ) : null}

            <div className="mt-6">
              <CreateSiteForm language={language} rootDomain={ROOT_DOMAIN} />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-zinc-400">{text.limit}</p>

            <a
              href="/admin"
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
            </a>
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

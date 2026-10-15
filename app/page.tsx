import { ArrowRight, CircleAlert, PanelsTopLeft } from "lucide-react";
import type { Metadata } from "next";
import { CreateSiteForm } from "@/components/create-site-form";
import { PlatformHeader, type Language } from "@/components/platform-header";
import { MAX_PAGES_PER_TEMP_SITE, TEMP_SITE_TTL_HOURS } from "@/lib/demo";
import { ROOT_DOMAIN } from "@/lib/rules";

const COPY = {
  zh: {
    eyebrow: "EDGEONE MAKERS · DOCS",
    headlinePrefix: "",
    headlineAccent: "几秒上线",
    headlineSuffix: "你的文档站",
    description: "一个项目服务多个站点。输入名称即可获得独立子域名，用 Markdown 写作，保存后立即上线。",
    formTitle: "创建体验站点",
    formDescription: "无需注册，起个名字即可开始。",
    manage: "我的站点",
    manageDescription: "查看并继续编辑已创建的站点",
    createdHost: "创建后获得独立地址",
    warning: "还没有配置 ROOT_DOMAIN，子域名站点暂时无法访问。",
    limit: `体验站点仅当前浏览器可编辑，最多 ${MAX_PAGES_PER_TEMP_SITE} 页，${TEMP_SITE_TTL_HOURS} 小时后自动删除。`,
    features: [
      { title: "独立域名路由", text: "按 Host 识别站点，子域名和自有域名都能访问。" },
      { title: "Markdown 即时发布", text: "编写、预览和保存都在同一个简洁后台完成。" },
      { title: "轻量基础设施", text: "内容存在 Blob，并按页面精确刷新缓存。" },
    ],
  },
  en: {
    eyebrow: "EDGEONE MAKERS · DOCS",
    headlinePrefix: "",
    headlineAccent: "Launch your docs",
    headlineSuffix: "in seconds",
    description:
      "Run multiple docs sites from one project. Name your site, get a dedicated subdomain, write in Markdown, and publish instantly.",
    formTitle: "Create a demo site",
    formDescription: "No account required. Just give it a name.",
    manage: "My sites",
    manageDescription: "View and continue editing your sites",
    createdHost: "Your site gets a dedicated address",
    warning: "ROOT_DOMAIN is not configured, so subdomain sites are currently unavailable.",
    limit: `Demo sites can only be edited in this browser, support up to ${MAX_PAGES_PER_TEMP_SITE} pages, and expire after ${TEMP_SITE_TTL_HOURS} hours.`,
    features: [
      { title: "Host-based routing", text: "Resolve subdomains and custom domains at the edge." },
      { title: "Markdown publishing", text: "Write, preview, and publish from one focused workspace." },
      { title: "Minimal infrastructure", text: "Store content in Blob and invalidate only changed pages." },
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
        title: "Makers Docs",
        description: "Create and publish multiple documentation sites from one project.",
      }
    : {
        title: "Makers Docs 文档站模板",
        description: "一个项目、一次部署，按域名服务所有文档站。",
      };
}

export default async function Home({ searchParams }: Props) {
  const query = await searchParams;
  const language: Language = query.lang === "en" ? "en" : "zh";
  const text = COPY[language];
  const exampleHost = `your-site.${ROOT_DOMAIN || "docs.example.com"}`;

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

            <div className="mt-5">
              <CreateSiteForm language={language} />
            </div>

            <a
              href="/admin"
              className="group mt-3 flex items-center gap-3 rounded-lg border border-primary/15 bg-white px-3.5 py-3 shadow-xs transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
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

            <div className="mt-8 flex flex-col gap-2 border-y py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start xl:flex-row xl:items-center">
              <span>{text.createdHost}</span>
              <code className="truncate rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700">{exampleHost}</code>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-zinc-400">{text.limit}</p>
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

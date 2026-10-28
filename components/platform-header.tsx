import { MessageCircle, Plus, Rocket } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { PlatformBrand } from "@/components/platform-brand";
import { Button } from "@/components/ui/button";

export type Language = "zh" | "en";

export const GITHUB_URL = "https://github.com/Chuck7Chen/makers-docs-template";
const DEPLOY_URL =
  "https://console.cloud.tencent.com/edgeone/makers/new?template=docs-multi-tenant-template&from=within&fromAgent=1&agentLang=typescript";
export const CONTACT_URL = "https://makers.edgeone.link/document/platform-and-multi-tenancy#联系我们";

const HOME_PATH: Record<Language, string> = { zh: "/", en: "/en" };

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.28-1.29-5.28-5.69 0-1.26.45-2.28 1.2-3.09-.12-.29-.52-1.47.11-3.05 0 0 .98-.32 3.16 1.18A11 11 0 0 1 12 6.12c.98 0 1.95.13 2.86.38 2.2-1.5 3.17-1.18 3.17-1.18.63 1.58.23 2.76.11 3.05.75.81 1.2 1.83 1.2 3.09 0 4.42-2.72 5.39-5.3 5.68.42.36.78 1.06.78 2.14v3.27c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

export function PlatformHeader({ language = "zh", admin = false }: { language?: Language; admin?: boolean }) {
  const text =
    language === "en"
      ? { deploy: "Deploy", contact: "Contact us", github: "View on GitHub" }
      : { deploy: "部署模板", contact: "联系我们", github: "在 GitHub 查看" };

  const utilityButton = "h-8 rounded-md px-2.5 text-xs sm:px-3";

  return (
    <header className={cn("border-b", admin ? "bg-white" : "border-primary/10 bg-[#f2f3ff]")}>
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        <PlatformBrand href={admin ? "/" : HOME_PATH[language]} />
        {admin ? (
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className={utilityButton}>
              <Link href="/admin">我的站点</Link>
            </Button>
            <Button asChild size="sm" className={utilityButton}>
              <Link href="/#create-site">
                <Plus data-icon="inline-start" />
                新建站点
              </Link>
            </Button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className="flex h-8 items-center rounded-md border bg-zinc-50 p-0.5 text-[11px]"
              role="group"
              aria-label={language === "en" ? "Language" : "语言"}
            >
              {(["zh", "en"] as const).map((option) => (
                <Link
                  key={option}
                  href={HOME_PATH[option]}
                  aria-current={language === option ? "page" : undefined}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    language === option ? "bg-white font-medium text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950",
                  )}
                >
                  {option === "zh" ? "中文" : "EN"}
                </Link>
              ))}
            </div>
            <Button asChild variant="outline" size="icon-sm" className="size-8 rounded-md" aria-label={text.github}>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" title={text.github}>
                <GitHubMark />
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              className={utilityButton}
              aria-label={text.deploy}
            >
              <a href={DEPLOY_URL} target="_blank" rel="noreferrer">
                <Rocket data-icon="inline-start" />
                <span className="hidden sm:inline">{text.deploy}</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className={utilityButton} aria-label={text.contact}>
              <a href={CONTACT_URL} target="_blank" rel="noreferrer">
                <MessageCircle data-icon="inline-start" />
                <span className="hidden sm:inline">{text.contact}</span>
              </a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

import { Clock, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminTabs } from "@/components/admin-tabs";
import { SiteMark } from "@/components/icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { hasSiteAccess } from "@/lib/access";
import { formatRemaining, isExpired, loadSite, requestHost, subdomainOrigin } from "@/lib/site";
import { brandStyle } from "@/lib/theme";

type Props = { children: ReactNode; params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const site = await loadSite((await params).site);
  return { title: site ? `${site.name} - 后台` : "后台" };
}

// 后台的每个页面都先经过这里校验编辑令牌；Server Action 另外各自校验
export default async function SiteAdminLayout({ children, params }: Props) {
  const { site: handle } = await params;
  if (!(await hasSiteAccess(handle))) redirect("/admin");
  const site = await loadSite(handle);
  if (!site || isExpired(site)) redirect("/admin");

  const origin = subdomainOrigin(handle, await requestHost());

  return (
    <div style={brandStyle(site.theme)}>
      <div className="flex flex-wrap items-center gap-4">
        <SiteMark icon={site.icon} logo={site.logo} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{site.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{origin.replace(/^https?:\/\//, "")}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={origin} target="_blank" rel="noreferrer">
            查看站点
            <ExternalLink data-icon="inline-end" />
          </a>
        </Button>
      </div>

      {site.expiresAt ? (
        <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-800">
          <Clock />
          <AlertTitle>体验站点，{formatRemaining(site.expiresAt)}后自动删除</AlertTitle>
          <AlertDescription>只能在当前浏览器编辑，不能上传图片。</AlertDescription>
        </Alert>
      ) : null}

      <AdminTabs handle={handle} />
      <div className="pt-6">{children}</div>
    </div>
  );
}

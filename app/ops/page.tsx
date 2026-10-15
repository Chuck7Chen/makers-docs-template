import { CircleAlert, Globe, LogOut, X } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  opsAddDomainAction,
  opsCreateSiteAction,
  opsDeleteSiteAction,
  opsRemoveDomainAction,
} from "@/app/ops/actions";
import { operatorLogoutAction } from "@/app/ops/login/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { SiteMark } from "@/components/icon";
import { PlatformHeader } from "@/components/platform-header";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { listDirs } from "@/lib/blob";
import { MAX_TEMP_SITES } from "@/lib/demo";
import { isOperator, operatorEnabled } from "@/lib/operator";
import { ROOT_DOMAIN } from "@/lib/rules";
import { formatRemaining, isExpired, isTemporary, loadSite, requestHost, subdomainOrigin, type SiteConfig } from "@/lib/site";
import { brandStyle } from "@/lib/theme";

export const metadata = { title: "平台管理", robots: { index: false } };

type Props = { searchParams: Promise<{ error?: string }> };

// 平台管理员创建的长期站点排前面，同类按创建时间从新到旧
async function allSites() {
  const dirs = await listDirs("sites/");
  const sites = await Promise.all(dirs.map((dir) => loadSite(dir.slice("sites/".length, -1))));
  return sites
    .filter((site): site is SiteConfig => !!site)
    .sort((a, b) => Number(isTemporary(a)) - Number(isTemporary(b)) || b.createdAt - a.createdAt);
}

function SiteBadge({ site }: { site: SiteConfig }) {
  if (site.expiresAt === undefined) return <Badge variant="secondary">常驻</Badge>;
  if (isExpired(site)) return <Badge variant="destructive">已过期</Badge>;
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
      临时，{formatRemaining(site.expiresAt)}后删除
    </Badge>
  );
}

function SiteRow({ site, host }: { site: SiteConfig; host: string }) {
  const origin = subdomainOrigin(site.handle, host);

  return (
    <li className="space-y-3 px-4 py-3" style={brandStyle(site.theme)}>
      <div className="flex flex-wrap items-center gap-3">
        <SiteMark icon={site.icon} logo={site.logo} size={32} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{site.name}</span>
            <SiteBadge site={site} />
          </p>
          <a href={origin} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">
            {origin.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <form action={opsDeleteSiteAction}>
          <input type="hidden" name="handle" value={site.handle} />
          <ConfirmButton
            size="sm"
            title={`删除站点“${site.name}”？`}
            description="所有页面、图片和设置都会清除，无法恢复。"
          >
            删除
          </ConfirmButton>
        </form>
      </div>

      {isTemporary(site) ? null : (
        <div className="flex flex-wrap items-center gap-2 pl-11">
          {site.domains.map((domain) => (
            <form
              key={domain}
              action={opsRemoveDomainAction}
              className="flex h-7 items-center gap-1.5 rounded-md bg-muted pr-0.5 pl-2 text-sm"
            >
              <input type="hidden" name="handle" value={site.handle} />
              <input type="hidden" name="host" value={domain} />
              <Globe className="size-3.5 text-muted-foreground" />
              <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="hover:underline">
                {domain}
              </a>
              <ConfirmButton
                variant="ghost"
                size="icon-xs"
                aria-label={`移除 ${domain}`}
                title={`移除域名 ${domain}？`}
                description="移除后访问这个域名不会再打开这个站点。"
                confirmText="移除"
              >
                <X />
              </ConfirmButton>
            </form>
          ))}
          <form action={opsAddDomainAction} className="flex items-center gap-1.5">
            <input type="hidden" name="handle" value={site.handle} />
            <Input name="host" required placeholder="自有域名，如 docs.acme.com" aria-label="自有域名" className="h-7 w-60" />
            <SubmitButton variant="outline" size="sm" pendingText="登记中…">
              登记
            </SubmitButton>
          </form>
        </div>
      )}
    </li>
  );
}

export default async function OpsPage({ searchParams }: Props) {
  // 中间件已经校验会话，页面自己再检查一次，不只依赖中间件
  if (!operatorEnabled()) notFound();
  if (!(await isOperator(await headers()))) redirect("/ops/login");
  const [{ error }, sites, host] = await Promise.all([searchParams, allSites(), requestHost()]);
  const tempCount = sites.filter(isTemporary).length;

  return (
    <div className="min-h-screen bg-muted/40">
      <PlatformHeader admin />
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">平台管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              共 {sites.length} 个站点，其中临时站点 {tempCount} 个（上限 {MAX_TEMP_SITES}）。平台管理员创建的站点长期保留，可以上传图片、登记自有域名。
            </p>
          </div>
          <form action={operatorLogoutAction}>
            <Button type="submit" variant="outline">
              <LogOut data-icon="inline-start" />
              退出登录
            </Button>
          </form>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        ) : null}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>用指定子域名建站</CardTitle>
            <CardDescription>建好后当前浏览器获得编辑权限，会跳到这个站点的后台。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={opsCreateSiteAction} className="flex flex-wrap items-center gap-2">
              <InputGroup className="w-auto">
                <InputGroupInput name="handle" required maxLength={32} placeholder="acme" aria-label="子域名" className="w-32" />
                <InputGroupAddon align="inline-end">.{ROOT_DOMAIN || "ROOT_DOMAIN"}</InputGroupAddon>
              </InputGroup>
              <Input name="name" required maxLength={40} placeholder="站点名称" aria-label="站点名称" className="w-56" />
              <SubmitButton pendingText="创建中…">建站</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="border-b">
            <CardTitle>全部站点</CardTitle>
          </CardHeader>
          {sites.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">还没有站点</p>
          ) : (
            <ul className="divide-y">
              {sites.map((site) => (
                <SiteRow key={site.handle} site={site} host={host} />
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}

import { BookOpenText, ExternalLink, Plus, ShieldCheck } from "lucide-react";
import { SiteMark } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { accessibleHandles, hasSiteAccess } from "@/lib/access";
import { operatorEnabled } from "@/lib/operator";
import { formatRemaining, isExpired, loadSite, requestHost, subdomainOrigin, type SiteConfig } from "@/lib/site";
import { brandStyle } from "@/lib/theme";

export const metadata = { title: "我的站点" };

// Cookie 只说明“可能有权限”，逐个核对令牌，再过滤掉已删除和过期的
async function mySites() {
  const handles = await accessibleHandles();
  const sites = await Promise.all(
    handles.map(async (handle) => ((await hasSiteAccess(handle)) ? loadSite(handle) : null)),
  );
  return sites
    .filter((site): site is SiteConfig => !!site && !isExpired(site))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export default async function MySitesPage() {
  const [sites, host] = await Promise.all([mySites(), requestHost()]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的站点</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            这里列出当前浏览器能编辑的站点。换浏览器或清除 Cookie 后就看不到了。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {operatorEnabled() ? (
            <Button asChild variant="outline">
              <a href="/ops">
                <ShieldCheck data-icon="inline-start" />
                平台管理
              </a>
            </Button>
          ) : null}
          <Button asChild>
            <a href="/">
              <Plus data-icon="inline-start" />
              新建站点
            </a>
          </Button>
        </div>
      </div>

      {sites.length === 0 ? (
        <Empty className="mt-6 border bg-background py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>还没有站点</EmptyTitle>
            <EmptyDescription>起个名字就能建一个文档站。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <a href="/">去创建</a>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="mt-6 gap-3">
          {sites.map((site) => {
            const origin = subdomainOrigin(site.handle, host);
            return (
              <Item
                key={site.handle}
                role="listitem"
                variant="outline"
                className="bg-background"
                style={brandStyle(site.theme)}
              >
                <ItemMedia>
                  <SiteMark icon={site.icon} logo={site.logo} size={36} />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle>{site.name}</ItemTitle>
                  <ItemDescription className="line-clamp-1">
                    {origin.replace(/^https?:\/\//, "")}
                    {site.expiresAt ? ` · ${formatRemaining(site.expiresAt)}后删除` : ""}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" asChild>
                    <a href={origin} target="_blank" rel="noreferrer">
                      查看
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`/admin/${site.handle}`}>编辑</a>
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </div>
  );
}

"use client";

import { Check, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addDomainAction, appearanceAction, deleteSiteAction, rebuildSearchAction, removeDomainAction, type SettingsResult } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/submit-button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_NAMES } from "@/lib/icons";
import type { SiteConfig } from "@/lib/site";
import { brandStyle, resolveTheme, THEME_NAMES, THEMES } from "@/lib/theme";

type Props = { initialSite: SiteConfig; initialError?: string };
type SettingsAction = (formData: FormData) => Promise<SettingsResult>;

// --brand and related variables follow the selected theme radio, so the icon recolors immediately without saving
const THEME_PREVIEW_CSS = THEME_NAMES.map((name) => {
  const vars = Object.entries(brandStyle(name))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return `#appearance:has([name="theme"][value="${name}"]:checked){${vars}}`;
}).join("");

export function SettingsPanel({ initialSite, initialError }: Props) {
  const [site, setSite] = useState(initialSite);
  const [appearance, setAppearance] = useState({
    name: initialSite.name,
    description: initialSite.description,
    icon: initialSite.icon,
    theme: resolveTheme(initialSite.theme),
  });
  const [host, setHost] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const notifiedError = useRef<string | undefined>(undefined);
  const handle = site.handle;
  const theme = appearance.theme;

  useEffect(() => {
    if (initialError && initialError !== notifiedError.current) {
      notifiedError.current = initialError;
      toast.error(initialError);
    }
  }, [initialError]);

  function submitAction(action: SettingsAction) {
    return async (formData: FormData) => {
      if (submitting.current) return;
      submitting.current = true;
      setPending(true);
      formData.set("handle", handle);
      formData.set("version", String(site.version));
      try {
        const result = await action(formData);
        if (result.site) setSite(result.site);
        if (result.error) toast.error(result.error);
        else {
          if (action === addDomainAction) setHost("");
          toast.success(result.message ?? "已保存");
        }
      } catch {
        toast.error("操作失败，请稍后重试");
      } finally {
        submitting.current = false;
        setPending(false);
      }
    };
  }

  return (
    <fieldset disabled={pending} className="min-w-0 space-y-6 border-0 p-0">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>外观</CardTitle>
          <CardDescription>显示在阅读端的顶栏和浏览器标签页上。</CardDescription>
        </CardHeader>
        <CardContent>
          <style>{THEME_PREVIEW_CSS}</style>
          <form id="appearance" action={submitAction(appearanceAction)}>
            <input type="hidden" name="handle" value={handle} />
            <input type="hidden" name="version" value={site.version} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="site-name">站点名称</FieldLabel>
                <Input id="site-name" name="name" value={appearance.name} onChange={(event) => setAppearance({ ...appearance, name: event.target.value })} required maxLength={40} />
              </Field>

              <Field>
                <FieldLabel htmlFor="site-description">简介</FieldLabel>
                <Textarea
                  id="site-description"
                  name="description"
                  value={appearance.description}
                  onChange={(event) => setAppearance({ ...appearance, description: event.target.value })}
                  maxLength={200}
                  rows={2}
                  placeholder="显示在首页标题下方，也用作搜索引擎摘要"
                />
              </Field>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">主题</FieldLegend>
                <FieldDescription>用于图标、链接和侧栏当前页的高亮。</FieldDescription>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {THEME_NAMES.map((name) => (
                    <label
                      key={name}
                      style={brandStyle(name)}
                      className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted has-checked:border-brand has-checked:bg-brand/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={name}
                        checked={name === theme}
                        onChange={() => setAppearance({ ...appearance, theme: name })}
                        className="peer sr-only"
                      />
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-transparent peer-checked:text-brand-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {THEMES[name].label}
                    </label>
                  ))}
                </div>
              </FieldSet>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">图标</FieldLegend>
                <FieldDescription>用主题色显示在顶栏，同时作为浏览器标签页的图标。</FieldDescription>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_NAMES.map((name) => (
                    <label
                      key={name}
                      title={name}
                      className="grid size-10 cursor-pointer place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground has-checked:border-transparent has-checked:bg-brand has-checked:text-brand-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                    >
                      <input type="radio" name="icon" value={name} checked={appearance.icon === name} onChange={() => setAppearance({ ...appearance, icon: name })} className="sr-only" />
                      <Icon name={name} size={18} />
                    </label>
                  ))}
                </div>
              </FieldSet>

              <div>
                <SubmitButton pendingText="保存中…">保存外观</SubmitButton>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>域名</CardTitle>
          <CardDescription>体验站点也可以接入自定义域名。登记域名不会延长有效期。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field>
            <FieldLabel htmlFor="current-prefix">域名前缀</FieldLabel>
            <Input id="current-prefix" value={handle} readOnly className="max-w-sm bg-muted font-mono" />
            <FieldDescription>在建站时自选或随机分配，创建后不能修改。站点过期清理后可重新使用。</FieldDescription>
          </Field>
          <form action={submitAction(addDomainAction)} className="space-y-3">
            <input type="hidden" name="handle" value={handle} />
            <input type="hidden" name="version" value={site.version} />
            <Field>
              <FieldLabel htmlFor="custom-domain">自定义域名</FieldLabel>
              <FieldDescription>先由部署方在 Makers 控制台将域名绑定到本项目，并配置 DNS 和证书，再登记到本站。</FieldDescription>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="custom-domain"
                  name="host"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder="docs.example.com"
                  required
                  maxLength={253}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 sm:flex-1"
                />
                <SubmitButton pendingText="登记中…">登记域名</SubmitButton>
              </div>
            </Field>
          </form>
          {site.domains.length ? (
            <ul className="divide-y rounded-lg border px-4">
              {site.domains.map((host, index) => (
                <li key={host} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm">{host}</p>
                    {index === 0 ? <p className="mt-1 text-xs text-muted-foreground">默认地址，用于 canonical 和 sitemap</p> : null}
                  </div>
                  <form action={submitAction(removeDomainAction)}>
                    <input type="hidden" name="handle" value={handle} />
                    <input type="hidden" name="version" value={site.version} />
                    <input type="hidden" name="host" value={host} />
                    <SubmitButton variant="outline" size="sm" pendingText="移除中…">移除</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="border border-dashed bg-muted/30 py-8" aria-live="polite">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-11 rounded-xl bg-primary/8 text-primary [&>svg]:size-5">
                  <Globe2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>尚未添加自定义域名</EmptyTitle>
                <EmptyDescription className="text-xs leading-6">
                  默认子域名仍可访问。配置好 DNS 和证书后，<br className="hidden sm:block" />
                  在上方登记域名，即可使用自己的访问地址。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>搜索索引</CardTitle>
          <CardDescription>保存页面时会自动更新索引。搜索结果和正文对不上时，可以按导航重建一次。</CardDescription>
          <CardAction>
            <form action={submitAction(rebuildSearchAction)}>
              <input type="hidden" name="handle" value={handle} />
              <SubmitButton variant="outline" pendingText="重建中…">
                重建索引
              </SubmitButton>
            </form>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="ring-destructive/25">
        <CardHeader>
          <CardTitle>删除站点</CardTitle>
          <CardDescription>删除后所有页面和设置都会清除，无法恢复。</CardDescription>
          <CardAction>
            <form action={deleteSiteAction}>
              <input type="hidden" name="handle" value={handle} />
              <ConfirmButton
                title={`删除站点“${site.name}”？`}
                description="所有页面和设置都会清除，无法恢复。"
                confirmText="删除站点"
              >
                删除站点
              </ConfirmButton>
            </form>
          </CardAction>
        </CardHeader>
      </Card>
    </fieldset>
  );
}

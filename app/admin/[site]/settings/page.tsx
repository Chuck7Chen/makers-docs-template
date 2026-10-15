import { Check, CircleAlert, CircleCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { appearanceAction, deleteSiteAction, rebuildSearchAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_IMAGE_BYTES } from "@/lib/demo";
import { ICON_NAMES } from "@/lib/icons";
import { isTemporary, loadSite } from "@/lib/site";
import { brandStyle, resolveTheme, THEME_NAMES, THEMES } from "@/lib/theme";

type Props = {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string; saved?: string; rebuilt?: string }>;
};

// 表单里的 --brand 等变量跟着选中的主题单选框走，图标即时换色，不用等保存
const THEME_PREVIEW_CSS = THEME_NAMES.map((name) => {
  const vars = Object.entries(brandStyle(name))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return `#appearance:has([name="theme"][value="${name}"]:checked){${vars}}`;
}).join("");

export default async function SettingsPage({ params, searchParams }: Props) {
  const [{ site: handle }, query] = await Promise.all([params, searchParams]);
  const site = await loadSite(handle);
  if (!site) notFound();
  const temporary = isTemporary(site);
  const theme = resolveTheme(site.theme);
  const message = query.saved ? "已保存" : query.rebuilt ? "搜索索引已重建" : null;
  const contents = temporary ? "所有页面和设置" : "所有页面、图片和设置";

  return (
    <div className="space-y-6">
      {query.error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{query.error}</AlertTitle>
        </Alert>
      ) : message ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CircleCheck />
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>外观</CardTitle>
          <CardDescription>显示在阅读端的顶栏和浏览器标签页上。</CardDescription>
        </CardHeader>
        <CardContent>
          <style>{THEME_PREVIEW_CSS}</style>
          <form id="appearance" action={appearanceAction}>
            <input type="hidden" name="handle" value={handle} />
            <input type="hidden" name="version" value={site.version} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="site-name">站点名称</FieldLabel>
                <Input id="site-name" name="name" defaultValue={site.name} required maxLength={40} />
              </Field>

              <Field>
                <FieldLabel htmlFor="site-description">简介</FieldLabel>
                <Textarea
                  id="site-description"
                  name="description"
                  defaultValue={site.description}
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
                        defaultChecked={name === theme}
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
                      <input type="radio" name="icon" value={name} defaultChecked={site.icon === name} className="sr-only" />
                      <Icon name={name} size={18} />
                    </label>
                  ))}
                </div>
              </FieldSet>

              {temporary ? null : (
                <Field>
                  <FieldLabel htmlFor="site-logo">Logo</FieldLabel>
                  <FieldDescription>
                    上传后代替图标显示。PNG、JPEG、GIF 或 WebP，不超过 {MAX_IMAGE_BYTES / 1024 / 1024} MB。
                  </FieldDescription>
                  <div className="flex flex-wrap items-center gap-4">
                    {site.logo ? (
                      <>
                        <img src={site.logo} alt="当前 logo" className="size-10 rounded-md border object-contain" />
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-logo" name="removeLogo" />
                          <Label htmlFor="remove-logo" className="font-normal">
                            移除 logo
                          </Label>
                        </div>
                      </>
                    ) : null}
                    <Input
                      id="site-logo"
                      type="file"
                      name="logo"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className="w-auto max-w-xs"
                    />
                  </div>
                </Field>
              )}

              <div>
                <SubmitButton pendingText="保存中…">保存外观</SubmitButton>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>搜索索引</CardTitle>
          <CardDescription>保存页面时会自动更新索引。搜索结果和正文对不上时，可以按导航重建一次。</CardDescription>
          <CardAction>
            <form action={rebuildSearchAction}>
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
          <CardDescription>删除后{contents}都会清除，无法恢复。</CardDescription>
          <CardAction>
            <form action={deleteSiteAction}>
              <input type="hidden" name="handle" value={handle} />
              <ConfirmButton
                title={`删除站点“${site.name}”？`}
                description={`${contents}都会清除，无法恢复。`}
                confirmText="删除站点"
              >
                删除站点
              </ConfirmButton>
            </form>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

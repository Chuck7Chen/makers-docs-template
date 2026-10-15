import { Globe2, Layers3, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OperatorLoginForm } from "@/app/ops/login/login-form";
import { PlatformHeader } from "@/components/platform-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isOperator, operatorEnabled } from "@/lib/operator";

export const metadata = {
  title: "平台管理登录",
  description: "登录 Makers Docs 平台管理。",
  robots: { index: false },
};

const FEATURES = [
  { icon: Layers3, text: "创建和管理长期文档站点" },
  { icon: Globe2, text: "登记站点自有域名" },
  { icon: ShieldCheck, text: "查看并维护全平台内容" },
];

export default async function OperatorLoginPage() {
  if (!operatorEnabled()) notFound();
  if (await isOperator(await headers())) redirect("/ops");

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <PlatformHeader />
      <main className="relative flex flex-1 items-center overflow-hidden bg-linear-to-b from-[#f2f3ff] via-white to-white">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-72 opacity-45 [background-image:radial-gradient(#b5c7ff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <section className="relative mx-auto grid w-full max-w-5xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.14em]">EDGEONE MAKERS · OPERATIONS</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-balance text-zinc-950 sm:text-5xl sm:leading-tight">
              管理你的
              <span className="text-primary font-bold">文档站平台</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">
              使用部署时配置的管理员凭证登录，集中管理站点、域名和长期内容。
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3 lg:grid-cols-1">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <Card className="border-primary/10 bg-white/95 py-6 shadow-xl shadow-primary/5 backdrop-blur [--card-spacing:--spacing(6)]">
            <CardHeader>
              <span className="mb-3 grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="size-5" />
              </span>
              <CardTitle className="text-xl tracking-tight">登录平台管理</CardTitle>
              <CardDescription>登录状态保留 12 小时，仅作用于平台管理区域。</CardDescription>
            </CardHeader>
            <CardContent>
              <OperatorLoginForm />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

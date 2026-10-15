import { NextResponse, type NextRequest } from "next/server";
import { isOperator } from "@/lib/operator";
import { HANDLE_RE } from "@/lib/rules";

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };

// 本地 edgeone makers dev 的代理会改写 Host，原域名在 X-Forwarded-Host 里
function getHost(req: NextRequest) {
  const forwarded = process.env.NODE_ENV === "development" ? req.headers.get("x-forwarded-host") : null;
  return (forwarded ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

// 平台域名走首页、后台和平台管理页（/ops 需登录）；其他域名改写到 /s/{handle 或域名}
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // EdgeOne 在加载 Middleware bundle 后才注入控制台环境变量，因此不能使用
  // 模块初始化阶段计算出的 ROOT_DOMAIN 常量，必须在请求执行时读取。
  const rootDomain = (
    process.env.ROOT_DOMAIN || (process.env.NODE_ENV === "development" ? "localhost" : "")
  ).toLowerCase();
  // 部署时没配 ROOT_DOMAIN 就无法区分域名，只提供平台本身，首页会提示去配置
  if (!rootDomain || pathname.startsWith("/assets/")) return NextResponse.next();

  const host = getHost(req);
  if (host === rootDomain || host === `www.${rootDomain}`) {
    if (pathname.startsWith("/s/")) return new NextResponse(null, { status: 404 });
    if (pathname === "/ops" || pathname.startsWith("/ops/")) {
      if (!process.env.ADMIN_PASSWORD) return new NextResponse(null, { status: 404 });
      const loggedIn = await isOperator(req.headers);
      if (pathname === "/ops/login") {
        if (loggedIn) {
          const url = req.nextUrl.clone();
          url.pathname = "/ops";
          return NextResponse.redirect(url);
        }
      } else if (!loggedIn) {
        const url = req.nextUrl.clone();
        url.pathname = "/ops/login";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  let site = host;
  if (host.endsWith(`.${rootDomain}`)) {
    site = host.slice(0, -rootDomain.length - 1);
    if (!HANDLE_RE.test(site)) return new NextResponse(null, { status: 404 });
  }
  const url = req.nextUrl.clone();
  url.pathname = `/s/${site}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

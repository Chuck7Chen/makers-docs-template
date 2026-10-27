import { NextResponse, type NextRequest } from "next/server";
import { resolveLiveSiteAtEdge } from "@/lib/lifecycle-edge";
import { HANDLE_RE } from "@/lib/rules";

// Makers currently only bundles Edge Runtime middleware; the Node runtime produces an empty middleware in production.
export const config = { matcher: ["/:path*"] };

const PRIVATE_CACHE = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
};
const LOCAL_LIFECYCLE_PATH = "/api/site-lifecycle/";

function getHost(req: NextRequest) {
  const forwarded = process.env.NODE_ENV === "development" ? req.headers.get("x-forwarded-host") : null;
  return (forwarded || req.headers.get("host") || req.nextUrl.hostname || "").split(":")[0].toLowerCase().replace(/\.$/, "");
}

async function resolveLocalLifecycle(req: NextRequest, rootDomain: string, identifier: string) {
  const url = req.nextUrl.clone();
  url.hostname = rootDomain;
  url.pathname = `${LOCAL_LIFECYCLE_PATH}${encodeURIComponent(identifier)}`;
  url.search = "";
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "x-docs-lifecycle": "1" },
  });
  if (response.status === 204) return true;
  if (response.status === 404) return false;
  throw new Error(`Local lifecycle endpoint returned ${response.status}`);
}

async function guard(req: NextRequest, rootDomain: string, identifier: string) {
  try {
    const localMode = process.env.NODE_ENV === "development" || !!process.env.DOCS_LOCAL_STORE_PATH;
    const live = localMode
      ? await resolveLocalLifecycle(req, rootDomain, identifier)
      : !!(await resolveLiveSiteAtEdge(identifier));
    if (!live) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
  } catch (error) {
    console.error("Site lifecycle lookup failed", error);
    return new NextResponse(null, { status: 503, headers: PRIVATE_CACHE });
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") return NextResponse.next();
  if (pathname.startsWith(LOCAL_LIFECYCLE_PATH)) {
    return req.headers.get("x-docs-lifecycle") === "1"
      ? NextResponse.next()
      : new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
  }

  // Console environment variables are read at request time.
  const rootDomain = (
    process.env.ROOT_DOMAIN || (process.env.NODE_ENV === "development" ? "localhost" : "")
  ).toLowerCase();

  if (pathname.startsWith("/assets/")) {
    const handle = pathname.split("/")[2] ?? "";
    const blocked = await guard(req, rootDomain, handle);
    return blocked ?? NextResponse.next({ headers: PRIVATE_CACHE });
  }
  if (!rootDomain) {
    if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
    return NextResponse.next();
  }

  const host = getHost(req);
  if (host === rootDomain || host === `www.${rootDomain}`) {
    if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
    return NextResponse.next();
  }
  if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });

  let site = host;
  if (host.endsWith(`.${rootDomain}`)) {
    site = host.slice(0, -rootDomain.length - 1);
    if (!HANDLE_RE.test(site)) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
  }
  const blocked = await guard(req, rootDomain, site);
  if (blocked) return blocked;

  const url = req.nextUrl.clone();
  url.pathname = `/s/${site}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { headers: PRIVATE_CACHE });
}

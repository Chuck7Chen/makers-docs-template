import { NextResponse, type NextRequest } from "next/server";
import { PRIVATE_CACHE } from "@/lib/lifecycle";
import { resolveLiveSiteAtEdge } from "@/lib/lifecycle-edge";
import { HANDLE_RE, isMakersHost } from "@/lib/rules";

// Makers currently only bundles Edge Runtime middleware; the Node runtime produces an empty middleware in production.
// Keep the matcher as is: Makers falls back to /:path* for patterns with lookaheads such as (?!_next), and treats
// any pattern containing parentheses as a raw regex, so a narrower matcher saves nothing and can stop matching
export const config = { matcher: ["/:path*"] };
const LOCAL_LIFECYCLE_PATH = "/api/site-lifecycle/";

// Diagnostics for the Server-Timing header: a random id per edge instance and how many requests it has handled,
// to tell whether Makers reuses instances (the gate's memory cache only helps when it does)
const INSTANCE = Math.random().toString(36).slice(2, 8);
let handled = 0;

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

// Returns the response headers for this request, plus a 404/503 response when the site must not be served.
// Server-Timing shows up in the browser's DevTools: how long the gate took and where the site came from
async function guard(req: NextRequest, rootDomain: string, identifier: string) {
  const started = Date.now();
  let source = "local";
  let status = 0;
  try {
    const localMode = process.env.NODE_ENV === "development" || !!process.env.DOCS_LOCAL_STORE_PATH;
    let live: boolean;
    if (localMode) {
      live = await resolveLocalLifecycle(req, rootDomain, identifier);
    } else {
      const result = await resolveLiveSiteAtEdge(identifier);
      live = !!result.site;
      source = result.source;
    }
    if (!live) status = 404;
  } catch (error) {
    console.error("Site lifecycle lookup failed", error);
    status = 503;
  }
  const headers = {
    ...PRIVATE_CACHE,
    "Server-Timing": `gate;dur=${Date.now() - started};desc="${source}", edge;desc="${INSTANCE} #${++handled}"`,
  };
  return { headers, blocked: status ? new NextResponse(null, { status, headers }) : null };
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

  if (!rootDomain) {
    if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
    return NextResponse.next();
  }

  const host = getHost(req);
  if (host === rootDomain || host === `www.${rootDomain}` || isMakersHost(host)) {
    if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
    // The English home page used to be /?lang=en; it is now the prerendered /en
    if (pathname === "/" && req.nextUrl.searchParams.get("lang") === "en") {
      const url = req.nextUrl.clone();
      url.pathname = "/en";
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }
  if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });

  let site = host;
  if (host.endsWith(`.${rootDomain}`)) {
    site = host.slice(0, -rootDomain.length - 1);
    if (!HANDLE_RE.test(site)) return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
  }
  const { headers, blocked } = await guard(req, rootDomain, site);
  if (blocked) return blocked;

  const url = req.nextUrl.clone();
  url.pathname = `/s/${site}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { headers });
}

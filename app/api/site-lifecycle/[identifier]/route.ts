import { NextResponse, type NextRequest } from "next/server";
import { resolveLiveSite } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
};

type Props = { params: Promise<{ identifier: string }> };

// In local file-store mode, the Edge Middleware checks site lifecycle through this Node route; unused with the real Blob store.
export async function GET(request: NextRequest, { params }: Props) {
  const localMode = process.env.NODE_ENV === "development" || !!process.env.DOCS_LOCAL_STORE_PATH;
  if (!localMode || request.headers.get("x-docs-lifecycle") !== "1") {
    return new NextResponse(null, { status: 404, headers: PRIVATE_CACHE });
  }
  try {
    const { identifier } = await params;
    return new NextResponse(null, {
      status: (await resolveLiveSite(identifier)) ? 204 : 404,
      headers: PRIVATE_CACHE,
    });
  } catch (error) {
    console.error("Local site lifecycle lookup failed", error);
    return new NextResponse(null, { status: 503, headers: PRIVATE_CACHE });
  }
}

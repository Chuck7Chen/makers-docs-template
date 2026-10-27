import { readBytes } from "@/lib/blob";
import { isValidHandle } from "@/lib/rules";
import { IMAGE_CONTENT_TYPES, IMAGE_FILE_RE, keys } from "@/lib/site";

// File names are random and never overwritten, so browsers and the CDN can cache them indefinitely
export async function GET(_request: Request, { params }: { params: Promise<{ site: string; file: string }> }) {
  const { site, file } = await params;
  const match = IMAGE_FILE_RE.exec(file);
  if (!isValidHandle(site) || !match) return new Response("Not Found", { status: 404 });
  const data = await readBytes(keys.asset(site, file));
  if (!data) return new Response("Not Found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": IMAGE_CONTENT_TYPES[match[1]],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

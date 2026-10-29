import { field, messageOf, UserError } from "@/lib/forms";
import { PRIVATE_CACHE } from "@/lib/lifecycle";
import { createSite } from "@/lib/manage";
import { isValidName, ROOT_DOMAIN } from "@/lib/rules";

// Site creation for the home page form. It can't be a Server Action: an Action posts to the page that calls it, and
// Makers serves the prerendered home page as a static file, so the POST never reaches the function and gets the 404 page

function reply(body: { handle?: string; error?: string }, status = 200) {
  return Response.json(body, { status, headers: PRIVATE_CACHE });
}

// Server Actions refuse posts from other sites by comparing Origin with the host; this route does the same.
// Requests without Origin aren't from a browser on another site, so they pass, as they do for Actions
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = origin.replace(/^https?:\/\//, "");
  return host === request.headers.get("host") || host === request.headers.get("x-forwarded-host")?.split(",")[0].trim();
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403, headers: PRIVATE_CACHE });
  // A body that isn't form data reads as an empty form and fails validation
  const formData = await request.formData().catch(() => new FormData());
  const name = field(formData, "name");
  const english = field(formData, "language") === "en";
  const chosenHandle = field(formData, "handle").toLowerCase();
  // The home page is prerendered and can't show this, so the deployer finds out here
  if (!ROOT_DOMAIN) {
    return reply({ error: english ? "ROOT_DOMAIN is not configured, so sites can't be created yet." : "还没有配置 ROOT_DOMAIN，暂时无法创建站点" }, 503);
  }
  if (!isValidName(name)) return reply({ error: english ? "Site name must be 1 to 40 characters." : "站点名称需要 1 到 40 个字" }, 400);
  try {
    return reply({ handle: await createSite(name, chosenHandle || undefined) });
  } catch (error) {
    return reply({ error: messageOf(error, english) }, error instanceof UserError ? 400 : 500);
  }
}

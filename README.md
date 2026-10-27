# Multi-Tenant Docs Template

English | [简体中文](./README_zh-CN.md)

## Introduction

A shared-codebase example for EdgeOne Makers: one Next.js project, deployed once, serves any number of docs sites by the requesting domain. Visitors pick a name or a subdomain prefix to create a site that lasts 24 hours, and can attach their own domain from the admin settings.

Apart from the middleware, Blob storage and custom domains that Makers provides, there are no external dependencies: no database, third-party login or search service.

- **Platform home**: Chinese/English switch, a demo site creation form, and links to GitHub, template deployment and contact.
- **Reader**: sidebar navigation (up to two levels), on-page table of contents, previous/next links, `Ctrl+K` / `⌘K` search, syntax highlighting with copy buttons, GFM (tables, task lists, footnotes), `sitemap.xml` and `robots.txt`. Each site has its own name, icon and theme, chosen from 10 preset color schemes.
- **Admin**: add, remove, reorder, move and rename groups and pages in a tree; write Markdown with live preview and publish on `Ctrl+S` / `⌘S`; change appearance, rebuild the search index, manage custom domains and delete the site in settings.

## Deploy

[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?from=github&template=nextjs-multi-tenant-docs)

After deploying:

1. Use a dedicated new domain rather than your brand domain: demo site content is created by visitors, so if the domain ever gets blocklisted, only that domain is affected. Use a subdomain such as `docs.example.com` as the platform domain to avoid CNAME issues at the apex.
2. Set the `ROOT_DOMAIN` environment variable in Makers.
3. Bind both `docs.example.com` and `*.docs.example.com` to the project. The wildcard certificate requires DNS validation.
4. Keep the build command as `npm run build` (it applies the ISR compatibility patch first).
5. Verify after going live: a second visit to the same page should hit the cache, saving in the admin should show new content on refresh, and site pages should open without 503 errors.

Demo sites host public visitor content; check with your security and compliance team whether content moderation is required before launch.

**Custom domains**: bind the domain (such as `docs.acme.com`) to the project in the Makers console and configure the CNAME as prompted, then register it in the site's admin settings. Both addresses work afterwards; canonical links and the sitemap use the custom domain.

## Demo

https://admin.cchen.online

Demo site limits (all in `lib/demo.ts`):

| | Demo site |
|---|---|
| Subdomain | 1-32 lowercase letters, digits and hyphens of your choice, or random |
| Lifetime | 24 hours; at most 100 at a time, the oldest is removed when full |
| Content | Up to 30 pages, 50 KB each, no image uploads |
| Custom domains | Managed in the admin settings |
| Display | Fixed top banner; not indexed by search engines |

## Environment Variables

| Variable | Description |
|---|---|
| `ROOT_DOMAIN` | Required for deployment. The platform domain, such as `docs.example.com`; sites live at `{handle}.docs.example.com`. Defaults to `localhost` in local development |

Configure production variables in the Makers console. When you run `edgeone makers build` / `deploy` locally, the adapter bundles the root `.env`, `.env.local` and similar files into the cloud function, so don't keep secrets there that production doesn't need.

Blob storage credentials are provided by Makers at deploy time; no configuration is needed.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling and components**: Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) (Radix), used only in the admin so reader pages ship no extra JS
- **Markdown**: unified / remark / rehype (GFM, sanitization, heading anchors, syntax highlighting)
- **Storage**: `@edgeone/pages-blob`
- **Deployment**: EdgeOne Makers (Edge Middleware + Node cloud functions)

### How It Works

- `middleware.ts` rewrites paths by Host and enforces site expiry: the platform domain (`ROOT_DOMAIN` and `www.ROOT_DOMAIN`) serves the home page and admin; `{handle}.ROOT_DOMAIN` is rewritten to `/s/{handle}/...`; any other domain is rewritten to `/s/{domain}/...` and resolved through the domain mapping. Expired sites return 404 and storage errors return 503.
- Reader pages use Next's Full Route Cache ISR: both layout and page `export const revalidate = false`, so HTML/RSC is generated on first visit and served from cache afterwards. The data layer uses `unstable_cache` with per-tenant cache tags, invalidated precisely by tag on save.
- Protected responses return `Cache-Control: private, no-store, max-age=0` and `CDN-Cache-Control: no-store` so outer caches can't bypass the expiry check.
- Creating a site issues an edit token stored in an HttpOnly cookie; Blob stores only its SHA-256 hash. Only the browser holding the token can edit the site, with no login.
- Search runs in the browser: each site serves `/search.json`, downloaded when the search box first opens.
- Site theme colors use the `--brand` CSS variables, separate from the component library's `--primary`.

All data lives in a single Blob store named `docs`:

```
sites/{handle}/site.json          name, theme, icon, custom domains, nav, version
sites/{handle}/pages/{slug}.json  page content
sites/{handle}/search.json        search index
sites/{handle}/auth.json          hash of the edit token
sites/{handle}/assets/{file}      images
domains/{host}.json               site for a custom domain
expiry/{expiresAt}_{handle}       expiry marker for demo sites
```

### Project Structure

```
middleware.ts               rewrites paths by Host
app/
  page.tsx                  platform home and site creation form
  admin/                    admin: my sites, nav tree, editor, settings; actions.ts holds the Server Actions
  s/[site]/                 reader: layout, pages, search.json, sitemap.xml, robots.txt
  assets/[site]/[file]/     images, shared by all domains
components/                 platform header, nav tree, editor, search, sidebar, etc.
  ui/                       shadcn/ui components, admin only
lib/
  blob.ts                   Blob access; falls back to .blob-local/ without credentials
  site.ts                   data types, Blob keys, cached reads with tags
  nav.ts                    nav types and edits, shared by server and nav tree
  manage.ts                 site creation/deletion, expiry cleanup, search index, images
  access.ts                 edit token issuing and checks
  invalidation.ts           invalidates site/page/domain tags and internal paths
  lifecycle.ts              resolveLiveSite: consistent reads and expiry checks
  markdown.ts               Markdown rendering and sanitization
  rules.ts                  validation for handles, page paths and domains
  demo.ts                   demo site lifetime and limits
  icons.ts                  preset icons
  samples.ts                built-in settings and multi-tenant guide for new sites
```

### Local Development

```bash
npm install
npm run dev
```

- Open `http://localhost:3000` to create a site; it is served at `http://{handle}.localhost:3000`.
- To test custom domains locally, point a test domain (such as `docs.acme.test`) at `127.0.0.1` in your hosts file.
- Without Blob credentials, data is written to `.blob-local/` in the project; delete the directory to reset.
- To use the real Blob store, link the project with `edgeone makers link`, then start with `edgeone makers dev` (port 8088 by default).
- `next dev` writes to `.next-dev/`, separate from the build's `.next/`, so you can run `edgeone makers build` / `deploy` while the dev server is running.

### Testing

```bash
npm test          # multi-tenant unit tests: site creation, expiry cleanup, custom domains, token isolation, cache tags, limits
npm run test:isr  # production ISR acceptance: real next build / next start in an isolated directory
```

`test:isr` covers full-page cache hits, refreshing both subdomain and custom domain after a save, clearing a cached 404 when a page is created, invalidating old caches after a domain is unbound and rebound, and returning 404 for cached pages immediately after a site expires or is deleted.

**Pinned version and patch**: after middleware rewrites a path, Next.js 15.5.27 wrongly marks the page as uncacheable. `npm run build` runs `scripts/patch-next-isr.mjs` first to fix this. The patch only accepts this version and fails on upgrade; re-verify before adjusting it.

### Bring Your Own Login

The template has no account system; the admin checks permissions only through `lib/access.ts`. To plug in your own login, rewrite these functions and leave the rest unchanged:

- `hasSiteAccess`: whether the current user can edit the site.
- `grantSiteAccess` / `revokeSiteAccess`: record and clear ownership on site creation and deletion.
- `accessibleHandles`: which sites appear under "My sites".

### Acknowledgements

- Preset icons come from [Lucide](https://lucide.dev) under the ISC License; the notice is kept in `lib/icons.ts`.
- `components/ui/` is generated by [shadcn/ui](https://ui.shadcn.com) under the MIT License.

## License

This project is open source under the MIT License.

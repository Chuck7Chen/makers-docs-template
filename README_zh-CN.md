# 文档站多租户模板

[English](./README.md) | 简体中文

## Introduction

EdgeOne Makers 的共享代码模式示例：一个 Next.js 项目、一次部署，按访问的域名服务任意多个文档站。访客起个名字或自选子域名前缀就能建站，24 小时有效；可在后台设置中接入自有域名。

除了 Makers 自带的中间件、Blob 和自定义域名，不依赖数据库、第三方登录或搜索等外部服务。

- **平台首页**：中英文切换、体验建站表单，以及 GitHub、模板部署和联系入口。
- **阅读端**：侧栏导航（最多两级）、本页目录、上一页和下一页、`Ctrl+K` / `⌘K` 搜索、代码高亮和一键复制、GFM（表格、任务列表、脚注）、`sitemap.xml` 和 `robots.txt`。每个站点有自己的名称、主题和图标，主题从 10 套预设配色里选。
- **后台**：在目录树里增删分组和页面、排序、移动、重命名；用 Markdown 写正文，可预览，`Ctrl+S` / `⌘S` 保存即发布；在设置里改外观、重建搜索索引、管理自有域名、删除站点。

## Deploy

[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?from=github&template=nextjs-multi-tenant-docs)

部署后还需要完成以下配置：

1. 准备一个独立的新域名，不要用品牌主域名：体验站点的内容由访客创建，万一域名被拉黑，影响只限于这个域名。平台域名用它的子域名，如 `docs.example.com`，避开根域名的 CNAME 问题。
2. 在 Makers 设置环境变量 `ROOT_DOMAIN`。
3. 把 `docs.example.com` 和 `*.docs.example.com` 都绑定到这个项目。泛域名证书要做 DNS 验证。
4. 构建命令保持 `npm run build`（会先执行 ISR 兼容补丁）。
5. 上线后复验：同一页面第二次访问应命中缓存；后台保存后刷新应看到新内容；站点页面正常打开、不出现 503。

体验站点是公开托管访客内容，上线前请和安全合规确认是否需要内容审核。

**接入自有域名**：先在 Makers 控制台把域名（如 `docs.acme.com`）绑定到项目，按提示配置 CNAME；再在站点后台的设置中把它登记。登记后两个地址都能访问，canonical 和 sitemap 用自有域名。

## Demo

https://admin.cchen.online

体验站点的限额（都在 `lib/demo.ts` 里）：

| | 体验站点 |
|---|---|
| 子域名 | 自选 1-32 位小写字母数字连字符，或随机分配 |
| 有效期 | 24 小时，最多同时存在 100 个，满了删最早的 |
| 内容 | 最多 30 页，每页 50 KB，不支持图片 |
| 自有域名 | 可在后台设置中管理 |
| 展示 | 顶部固定横幅，不让搜索引擎收录 |

## Environment Variables

| 变量 | 说明 |
|---|---|
| `ROOT_DOMAIN` | 部署时必填。平台域名，如 `docs.example.com`，站点地址是 `{handle}.docs.example.com`。本地开发不配置时默认 `localhost` |

线上变量在 Makers 控制台配置。本地执行 `edgeone makers build` / `deploy` 时，适配器会把项目根目录的 `.env`、`.env.local` 等文件一起打进云函数，这些文件里不要放线上用不到的密钥。

Blob 存储由 Makers 在部署时自动提供凭证，无需配置。

## Tech Stack

- **框架**：Next.js 15（App Router）+ React 19 + TypeScript
- **样式与组件**：Tailwind CSS 4、[shadcn/ui](https://ui.shadcn.com)（Radix），只在后台使用，不增加阅读端的 JS
- **Markdown**：unified / remark / rehype（GFM、净化、标题锚点、代码高亮）
- **存储**：`@edgeone/pages-blob`
- **部署**：EdgeOne Makers（Edge Middleware + Node 云函数）

### 工作原理

- `middleware.ts` 按 Host 改写路径，并执行过期门禁检查：平台域名（`ROOT_DOMAIN` 和 `www.ROOT_DOMAIN`）进入首页和后台；`{handle}.ROOT_DOMAIN` 改写到 `/s/{handle}/...`；其他域名改写到 `/s/{域名}/...`，再查域名映射找到站点。过期返回 404，存储异常返回 503。
- 阅读端采用 Next Full Route Cache ISR：layout 和 page 都 `export const revalidate = false`，首次访问生成 HTML/RSC，后续缓存命中。数据层使用 `unstable_cache` 加缓存标签隔离租户，保存后按 tag 精确失效。
- 门禁在每个请求命中 CDN 缓存之前执行，站点过期或删除后不会再返回缓存的页面。门禁自己返回的 404/503 带 `Cache-Control: private, no-store`；通过门禁的页面走 ISR/CDN 缓存。
- 为了让页面切换更快，每个边缘实例会把有效站点记住 10 秒（`lib/lifecycle-edge.ts`）。删站或解绑域名最多延迟 10 秒生效；24 小时到期仍然精确。
- 建站时生成一个编辑令牌，浏览器存在 HttpOnly Cookie 里，Blob 只存它的 SHA-256 哈希。只有持有令牌的浏览器能编辑这个站点，不需要登录。
- 搜索在浏览器里完成：每个站点输出 `/search.json`，鼠标移到搜索框或打开搜索时才下载。
- 阅读端页内切换（`components/doc-link.tsx`）：只请求正文部分，鼠标悬停或键盘聚焦到链接时预取。每次请求仍经过门禁；访问过的页面 30 秒内再访问不发请求（`next.config.ts` 的 `staleTimes`）。
- 平台首页（`/` 和 `/en`）在构建时预渲染，由边缘缓存直接返回，不调用云函数；建站表单的域名后缀在浏览器里按当前地址显示。后台按请求渲染，站内用客户端路由切换，等待时先显示骨架屏（`app/admin/**/loading.tsx`）；打开编辑器是整页跳转，这样浏览器返回键仍会提示未保存的修改。
- 客户端路由切换时只渲染变化的部分，布局不会重新执行，所以后台每个页面都自己校验编辑令牌（`lib/access.ts` 的 `loadEditableSite`）。
- 建站后的过期清理、保存页面后的缓存刷新放在 `after()` 里，响应发出后再执行，不拖慢操作。
- 站点主题色用 `--brand` 系列 CSS 变量，避开组件库的 `--primary`。
- 站点只支持文字：渲染时丢弃 Markdown 里的图片，也没有上传接口。
- Pages Blob 目前没有条件写入（`onlyIfNew` 不生效），写入都是先查再写。两个访客同一瞬间抢同一个前缀、或同一瞬间保存两个页面时可能互相覆盖；搜索索引可在设置里"重建搜索索引"修复。

数据都在一个 Blob store `docs` 里：

```
sites/{handle}/site.json          名称、主题名、图标、自有域名、导航、版本号
sites/{handle}/pages/{slug}.json  页面正文
sites/{handle}/search.json        搜索索引
sites/{handle}/auth.json          编辑令牌的哈希
domains/{host}.json               自有域名对应的站点
expiry/{到期时间}_{handle}          体验站点的过期标记
```

### 目录

```
middleware.ts               按 Host 改写路径
app/
  page.tsx、en/page.tsx     平台首页（中文、英文），内容在 components/platform-home.tsx
  admin/                    后台：我的站点、目录树、编辑器、设置；actions.ts 是后台的 Server Action
  s/[site]/                 阅读端：布局、阅读页、search.json、sitemap.xml、robots.txt
components/                 平台头部、目录树、编辑器、搜索框、侧栏等
  ui/                       shadcn/ui 组件，只在后台用
lib/
  blob.ts                   Blob 读写；本地没有凭证时改用 .blob-local/
  site.ts                   数据类型、Blob key，带缓存 tag 的读取
  nav.ts                    导航的类型和增删改，服务端和目录树共用
  manage.ts                 建站、删站、过期清理、搜索索引
  access.ts                 编辑令牌的签发和校验
  invalidation.ts           统一失效 site/page/domain 标签和实际内部路径
  keys.ts                   Blob key
  lifecycle.ts              resolveLiveSite：站点查找和过期检查，中间件和页面共用
  markdown.ts               Markdown 渲染和过滤
  rules.ts                  handle、页面地址、域名等校验规则
  demo.ts                   体验站点的有效期和限额
  icons.ts                  预设图标
  samples.ts                新站点自带的站点设置和多租户指南
```

### 本地开发

```bash
npm install
npm run dev
```

- 打开 `http://localhost:3000` 建站，站点地址是 `http://{handle}.localhost:3000`。
- 在 hosts 里把测试域名（如 `docs.acme.test`）指到 `127.0.0.1`，可在本地测试自有域名。
- 没有 Blob 凭证时，数据写在项目下的 `.blob-local/`，删掉这个目录就是清空数据。
- 要连真实的 Blob，先 `edgeone makers link` 关联项目，再用 `edgeone makers dev` 启动（默认端口 8088）。
- `next dev` 的产物在 `.next-dev/`，和构建用的 `.next/` 分开，所以开着 dev server 也能执行 `edgeone makers build` / `deploy`。

### 测试

```bash
npm test          # 多租户单元测试：建站、过期清理、自有域名、编辑令牌隔离、缓存标签、限额
npm run test:isr  # 生产 ISR 验收：在隔离目录里执行真实的 next build / next start
```

`test:isr` 覆盖整页缓存命中、保存后子域名和自有域名同时刷新、新建页面清除缓存的 404、域名解绑重绑后旧缓存失效、站点到期或删除后缓存页面立即返回 404。

**版本锁定与补丁**：Next.js 15.5.27 在中间件改写路径后会把页面误判为不可缓存，`npm run build` 会先执行 `scripts/patch-next-isr.mjs` 修复。补丁只认这个版本，升级 Next.js 时脚本会报错，需要重新验证后再调整。

### 接入自己的登录

模板没有账号体系，后台只通过 `lib/access.ts` 判断权限。正式使用时改写这几个函数以接入企业登录，其余代码不用动：

- `hasSiteAccess`：当前用户能否编辑这个站点。
- `grantSiteAccess` / `revokeSiteAccess`：建站和删站时记下、清除归属。
- `accessibleHandles`："我的站点"列出哪些站点。

### 鸣谢

- 预设图标来自 [Lucide](https://lucide.dev)，遵循 ISC 许可，声明保留在 `lib/icons.ts` 里。
- `components/ui/` 由 [shadcn/ui](https://ui.shadcn.com) 生成，遵循 MIT 许可。

## License

本项目基于 MIT 许可证开源。

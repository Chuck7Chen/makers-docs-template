# 文档站多租户模板

EdgeOne Makers 的共享代码模式示例：一个 Next.js 项目、一次部署，按访问的域名服务任意多个文档站。访客起个名字就能建站，马上得到一个子域名；模板部署方可以通过平台管理入口创建长期站点、上传图片、接入自有域名。

除了 Makers 自带的中间件、ISR、Blob 和自定义域名，不依赖数据库、第三方登录或搜索等外部服务。

需要深入了解路由、存储、鉴权、缓存、编辑器和安全边界，请阅读[完整实现说明](./IMPLEMENTATION.md)。

## 功能

- **平台首页**：中英文切换、体验建站表单，以及 GitHub、模板部署和联系入口。
- **阅读端**：侧栏导航（最多两级）、本页目录、上一页和下一页、`Ctrl+K` / `⌘K` 搜索、代码高亮和一键复制、GFM（表格、任务列表、脚注）、`sitemap.xml` 和 `robots.txt`。每个站点有自己的名称、主题和图标，主题从 10 套预设配色里选。
- **后台**：在平台首页建站；在目录树里增删分组和页面、排序、移动、重命名；用 Markdown 写正文，可预览，`Ctrl+S` / `⌘S` 保存即发布；在设置里改外观、重建搜索索引、删除站点。
- **平台管理页 `/ops`**：供模板部署方用指定子域名建站、登记自有域名、查看和删除全部站点。配置管理员密码后启用，使用站内登录页和 12 小时签名会话；它不是租户角色或完整账号系统。

平台首页创建的是体验站点，平台管理页创建的是长期站点：

| | 体验站点 | 长期站点 |
|---|---|---|
| 子域名 | 随机分配，形如 `try-k3x9p2` | 平台管理员指定，如 `acme` |
| 有效期 | 24 小时，最多同时存在 100 个，满了删最早的 | 长期 |
| 内容 | 最多 30 页，每页 50 KB，不能上传图片 | 不限页数；可以上传 logo 和正文图片，单张 1 MB |
| 自有域名 | 不能 | 可以 |
| 展示 | 顶部固定横幅，不让搜索引擎收录 | 正常 |

限额都在 `lib/demo.ts` 里。

## 工作原理

- `middleware.ts` 按 Host 改写路径：平台域名（`ROOT_DOMAIN` 和 `www.ROOT_DOMAIN`）进入首页、后台和平台管理页；`{handle}.ROOT_DOMAIN` 改写到 `/s/{handle}/...`；其他域名改写到 `/s/{域名}/...`，再查域名映射找到站点。
- 阅读端按 ISR 缓存：第一次访问时渲染并缓存，之后直接返回缓存。保存后按 tag 作废，只刷新改动的站点和页面，子域名和自有域名下的缓存一起失效。
- 建站时生成一个编辑令牌，浏览器存在 HttpOnly Cookie 里，Blob 只存它的 SHA-256 哈希。只有持有令牌的浏览器能编辑这个站点，不需要登录。平台管理页另用管理员账号、密码和 HMAC 签名会话，两套凭证互不替代。
- 搜索在浏览器里完成：每个站点输出 `/search.json`，打开搜索框时才下载。
- 后台界面用 [shadcn/ui](https://ui.shadcn.com)（Radix 加 Tailwind），组件代码在 `components/ui/`，阅读端不引用，不增加阅读端的 JS。站点主题色用 `--brand` 系列 CSS 变量，避开组件库的 `--primary`。

数据都在一个 Blob store `docs` 里：

```
sites/{handle}/site.json          名称、主题名、图标、自有域名、导航、版本号
sites/{handle}/pages/{slug}.json  页面正文
sites/{handle}/search.json        搜索索引
sites/{handle}/auth.json          编辑令牌的哈希
sites/{handle}/assets/{file}      图片
domains/{host}.json               自有域名对应的站点
expiry/{到期时间}_{handle}          体验站点的过期标记
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `ROOT_DOMAIN` | 部署时必填。平台域名，如 `docs.example.com`，站点地址是 `{handle}.docs.example.com`。本地开发不配置时默认 `localhost` |
| `ADMIN_USERNAME` | 选填。平台管理员账号，留空时为 `admin` |
| `ADMIN_PASSWORD` | 选填。平台管理员密码，建议使用 16 位以上随机串；不配置时不显示管理入口，`/ops` 返回 404 |

## 本地开发

```bash
npm install
npm run dev
```

- 打开 `http://localhost:3000` 建站，用 `http://try-k3x9p2.localhost:3000` 这样的地址访问站点。Chrome 会把 `*.localhost` 解析到本机，其他浏览器可能要改 hosts。
- 要用平台管理页，`cp .env.example .env.local`，填写 `ADMIN_PASSWORD`；账号不填时使用 `admin`，修改后重启。
- 没有 Blob 凭证时，数据写在项目下的 `.blob-local/`，删掉这个目录就是清空数据。
- 要连真实的 Blob，先 `edgeone makers link` 关联项目，再用 `edgeone makers dev` 启动（默认端口 8088）。Next 项目不会自动提示关联，不关联就拿不到 Blob 凭证。
- 想在本地试自有域名，在 hosts 里把一个测试域名（如 `docs.acme.test`）指到 `127.0.0.1`，在平台管理页登记后访问 `http://docs.acme.test:3000`。

## 部署到 EdgeOne Makers

1. 准备一个独立的新域名，不要用品牌主域名：体验站点的内容由访客创建，万一域名被拉黑，影响只限于这个域名。平台域名用它的子域名，如 `docs.example.com`，避开根域名的 CNAME 问题。
2. 在 Makers 导入本项目，设置 `ROOT_DOMAIN`、`ADMIN_PASSWORD`，按需设置 `ADMIN_USERNAME`，然后部署。
3. 把 `docs.example.com` 和 `*.docs.example.com` 都绑定到这个项目。泛域名证书要做 DNS 验证。
4. 打开 `docs.example.com/ops`，用指定子域名建示例站。

体验站点是公开托管访客内容，上线前请和安全合规确认是否需要内容审核。

**接入自有域名**：先在 Makers 控制台把域名（如 `docs.acme.com`）绑定到项目，按提示配置 CNAME；再在平台管理页把它登记到对应的站点。登记后两个地址都能访问，canonical 和 sitemap 用自有域名。

## 目录

```
middleware.ts               按 Host 改写路径，校验平台管理签名会话
app/
  page.tsx                  平台首页和建站表单
  admin/                    后台：我的站点、目录树、编辑器、设置；actions.ts 是后台的 Server Action
  ops/                      平台管理、登录页和它们的 Server Action
  s/[site]/                 阅读端：布局、阅读页、search.json、sitemap.xml、robots.txt
  assets/[site]/[file]/     图片，所有域名共用
components/                 平台头部、目录树、编辑器、搜索框、侧栏等
  ui/                       shadcn/ui 组件，只在后台用
lib/
  blob.ts                   Blob 读写；本地没有凭证时改用 .blob-local/
  site.ts                   数据类型、Blob key，带缓存 tag 的读取
  nav.ts                    导航的类型和增删改，服务端和目录树共用
  manage.ts                 建站、删站、过期清理、搜索索引、图片
  access.ts                 编辑令牌的签发和校验
  operator.ts               平台管理凭证和签名 Cookie 校验，中间件与 /ops 共用
  markdown.ts               Markdown 渲染和过滤
  rules.ts                  handle、页面地址、域名等校验规则
  demo.ts                   体验站点的有效期和限额
  icons.ts                  预设图标
  samples.ts                新站点自带的 Makers 多租户指南
```

## 接入自己的登录

模板没有账号体系，后台只通过 `lib/access.ts` 判断权限。正式使用时改写这几个函数，其余代码不用动：

- `hasSiteAccess`：当前用户能否编辑这个站点。
- `grantSiteAccess` / `revokeSiteAccess`：建站和删站时记下、清除归属。
- `accessibleHandles`：“我的站点”列出哪些站点。

## 许可

预设图标来自 [Lucide](https://lucide.dev)，遵循 ISC 许可，声明保留在 `lib/icons.ts` 里。`components/ui/` 由 shadcn/ui 生成，遵循 MIT 许可。

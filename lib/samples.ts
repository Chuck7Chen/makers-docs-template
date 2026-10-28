import type { NavItem } from "@/lib/nav";

// Built-in guide pages for new sites

export const SAMPLE_NAV: NavItem[] = [
  { title: "概览", slug: "index" },
  { title: "快速开始", slug: "quick-start" },
  { title: "站点设置", slug: "settings" },
  { title: "自定义域名", slug: "custom-domain" },
  { title: "模板架构", slug: "architecture" },
  { title: "ISR 与缓存刷新", slug: "isr" },
];

export const SAMPLE_PAGES: Record<string, string> = {
  index: `这是一个基于 EdgeOne Makers 构建的**多租户文档站模板**，采用共享代码模式：一个 Next.js 项目、一次部署，按访问域名服务多个独立站点。

> **仅供体验。** 本模板用于演示多租户模板的核心功能——域名路由、站点隔离、内容编辑与自定义域名。体验站点 24 小时后自动删除，不适合存放正式内容。

## 你可以体验什么

- **自选域名前缀**：建站时填写子域名前缀（如 \`acme\`），获得独立地址 \`acme.{平台域名}\`；
- **Markdown 写作**：在后台编辑和预览 Markdown，保存即发布；
- **自定义域名**：为站点绑定自有域名，详见[自定义域名](/custom-domain)；
- **站点配置**：切换主题、图标，管理导航结构。

## 开始使用

1. 从平台首页创建站点 → [快速开始](/quick-start)
2. 在后台调整外观和导航 → [站点设置](/settings)
3. 绑定自有域名 → [自定义域名](/custom-domain)

## 了解更多

多租户方案的完整说明请参阅官方文档：

- [平台与多租户方案概览](https://makers.edgeone.link/document/platform-and-multi-tenancy)
- [EdgeOne Middleware](https://makers.edgeone.link/document/middleware)
- [域名管理概览](https://makers.edgeone.link/document/domain-overview)
`,

  "quick-start": `从首页创建站点到发布内容，只需几分钟。

> 体验站点仅当前浏览器可编辑，最多 30 页，24 小时后自动删除。

## 1. 创建站点

1. 打开平台首页，输入站点名称；
2. 可选填写子域名前缀（留空则自动分配 \`try-\` 开头的随机前缀）；
3. 点击**创建站点**，进入后台。

浏览器会保存编辑凭证（HttpOnly Cookie），无需注册。换浏览器或清除 Cookie 后将无法继续编辑。

## 2. 管理导航

在后台**页面**标签的目录中：

- 点击**新建页面**，填写标题和地址（如 \`guide/install\`）；
- 用分组组织同一主题的页面，侧栏最多显示两级；
- 通过右侧菜单重命名、排序、移动或删除页面。

## 3. 编辑和发布

点击页面名称进入编辑器：

1. 修改标题、简介和 Markdown 正文；
2. 点击**预览**查看效果；
3. 点击**保存**或按 \`Ctrl+S\` / \`⌘S\`，保存即发布。新打开或刷新的阅读页马上就是新内容。

正文支持 GFM 语法：表格、任务列表、删除线、脚注和代码块。不支持图片，正文里的图片语法不会显示。

## 下一步

- 调整外观 → [站点设置](/settings)
- 绑定域名 → [自定义域名](/custom-domain)
`,

  settings: `在后台**设置**标签中配置站点外观。

## 站点信息

- **站点名称**：显示在顶栏和浏览器标签页；
- **简介**：显示在首页标题下方，也用作搜索引擎摘要。

## 主题和图标

- 从 10 套预设主题中选择配色，图标和链接高亮色会随之切换；
- 从预设图标库中选择站点图标，用主题色显示在顶栏。

保存即生效，新打开或刷新的阅读页马上显示新外观。

## 搜索索引

保存页面时搜索索引自动更新。如果搜索结果与正文不一致，可以在设置中点击**重建索引**。

## 删除站点

在设置底部可以删除站点，所有页面和配置会被清除，无法恢复。体验站点 24 小时后也会自动清理。
`,

  "custom-domain": `体验站点创建后自动获得子域名（如 \`acme.{平台域名}\`），还可以在后台设置中绑定自有域名。

> 绑定自有域名不会延长体验站点的 24 小时有效期。

## 操作步骤

### 第一步：在 Makers 控制台绑定域名

自有域名需要先在 Makers 项目中完成基础设施配置：

1. 进入 [Makers 控制台](https://console.cloud.tencent.com/edgeone/makers)，打开对应项目的**域名管理**；
2. 点击**添加域名**，输入完整域名（如 \`docs.acme.com\`）；
3. 按提示在域名服务商处添加 DNS 记录，完成归属验证；
4. 配置 CNAME 指向 Makers 分配的地址；
5. 等待 SSL 证书签发和域名状态变为正常。

> 详细流程参见 [添加自定义域名](https://makers.edgeone.link/document/custom-domain)。

### 第二步：在站点后台登记域名

Makers 控制台配置完成后，回到站点后台：

1. 打开**设置**标签，找到**域名**卡片；
2. 在输入框中填写完整域名（如 \`docs.acme.com\`），点击**登记域名**；
3. 登记成功后，子域名和自有域名都能访问站点内容。

### 第三步：验证访问

在浏览器中直接访问自有域名，确认页面正常显示。

## 移除域名

在设置的域名列表中，点击对应域名旁的**移除**按钮即可解除绑定。移除后最多 10 秒，该域名不再指向本站点。

## 注意事项

- **第一个自有域名**会被用于 canonical 链接和 sitemap，建议优先登记最常用的域名；
- 平台域名（\`ROOT_DOMAIN\` 及其子域名）无需登记，系统自动处理；
- 每个域名同一时间只能绑定一个站点，已被其他站点占用的域名需先在原站点移除；
- 域名登记仅在应用层建立映射，**不会**自动完成 DNS 配置或证书签发；
- 加速区域包含中国大陆的域名需要完成工信部备案，详见[域名管理概览](https://makers.edgeone.link/document/domain-overview)。

## 子域名前缀

建站时可以自选子域名前缀：

- 1–32 位小写字母、数字和连字符，首尾不能是连字符；
- \`www\`、\`admin\`、\`api\`、\`app\` 为保留前缀；
- 留空则自动分配 \`try-\` 开头的随机前缀；
- 已被未过期站点占用的前缀会被拒绝，过期后可复用；
- 建站后不支持修改前缀。
`,

  architecture: `本模板的技术实现概要。完整多租户方案请参阅[官方文档](https://makers.edgeone.link/document/platform-and-multi-tenancy)。

## 请求路由

\`middleware.ts\` 按 Host 识别租户，执行过期门禁检查：

\`\`\`text
请求 acme.docs.example.com/guide
  → Middleware 按 Host 得到 acme，检查站点是否存在、是否过期（读 Blob）
  → 不存在或已过期返回 404，存储异常返回 503
  → rewrite 到 /s/acme/guide
  → 返回整页缓存；还没有缓存时读取该租户的配置和正文生成
\`\`\`

平台域名进入首页和后台；租户子域名和自有域名改写到内部的 \`/s/[site]\` 路由。

## 数据存储

所有租户数据共用一个 Blob store，按 handle 前缀隔离：

\`\`\`text
sites/{handle}/site.json       站点配置
sites/{handle}/pages/{slug}.json  页面内容
sites/{handle}/search.json     搜索索引
sites/{handle}/auth.json       编辑凭证哈希
domains/{host}.json            自有域名映射
expiry/{到期时间}_{handle}        体验站点的过期标记，用于清理
\`\`\`

## 缓存与失效

首次访问生成整页缓存，后续缓存命中；保存时按标签精确失效，下次访问重新生成。阅读端站内链接走客户端路由，切换页面只请求正文数据。中间件在每次请求前检查站点是否存在和过期，通过后才返回缓存。详见 [ISR 与缓存刷新](/isr)。

## 编辑鉴权

建站时生成随机令牌存入 HttpOnly Cookie，Blob 只存 SHA-256 哈希。每个 Server Action 独立校验令牌和版本号。

## 参考链接

- [平台与多租户](https://makers.edgeone.link/document/platform-and-multi-tenancy)
- [EdgeOne Middleware](https://makers.edgeone.link/document/middleware)
- [域名管理概览](https://makers.edgeone.link/document/domain-overview)
- [添加自定义域名](https://makers.edgeone.link/document/custom-domain)
`,

  isr: `本模板阅读页采用**按需再生（On-demand ISR）**：首次访问生成整页缓存，之后直接返回缓存；没有定时刷新，只有内容或设置变更时才失效，下一次访问重新生成。

## 工作方式

1. 阅读页设置 \`revalidate = false\`，首次访问生成缓存，后续直接返回；
2. 后台保存、建页、删页、改设置或域名时，调用 \`revalidateTag\` / \`revalidatePath\` 精确失效对应缓存；
3. 下一次访问重新生成页面。子域名和自有域名共用同一组标签，会同时更新。

这和 Makers 官方文档里的[按需再生](https://makers.edgeone.link/document/framework-nextjs)用的是同一套 Next.js API，只是触发位置从外部 Webhook 改成了后台的 Server Action。

## 门禁

中间件在每次请求前检查站点是否存在和是否过期，通过后才返回缓存。站点到期或被删除后，即使缓存还在，也不会返回给访客。

## 页内切换

阅读端的站内链接走客户端路由，切换页面只请求正文数据，顶栏、侧栏和搜索索引保持不动。已看过的页面 30 秒内再切换不发请求。

## 排查

- 线上响应头 \`EO-Cache-Status\` 表示是否命中边缘缓存；
- 本地 \`next start\` 时，\`x-nextjs-cache\` 的 HIT / MISS 表示是否命中整页缓存；
- 经过门禁的响应带 \`Server-Timing\`，可以看到门禁耗时。

## 版本与补丁

本模板锁定 Next.js 15.5.27。这个版本在中间件改写路径后，会把页面误判为不可缓存，构建时 \`scripts/patch-next-isr.mjs\` 自动修复。升级 Next.js 时需要重新验证 ISR 行为。

## 参考

- [Makers：Next.js ISR 支持](https://makers.edgeone.link/document/framework-nextjs)
- [Next.js：增量静态再生成](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
`,
};

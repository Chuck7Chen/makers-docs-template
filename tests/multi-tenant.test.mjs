import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixture() {
  const objects = new Map();
  const cookieJar = new Map();
  const dataCache = new Map();
  const modules = new Map();
  const errors = [];
  let now = 1800000000000;
  let failWrite;
  let edgeReads = 0;
  class Clock extends Date {
    static now() { return now; }
  }
  const copy = (value) => value == null ? null : structuredClone(value);
  const mocks = {
    "@/lib/blob": {
      readJSON: async (key) => copy(objects.get(key)),
      writeJSON: async (key, value) => {
        if (failWrite === key) {
          failWrite = undefined;
          throw new Error("storage unavailable");
        }
        objects.set(key, copy(value));
      },
      remove: async (key) => objects.delete(key),
      listKeys: async (prefix) => [...objects.keys()].filter((key) => key.startsWith(prefix)),
    },
    "@edgeone/pages-blob": {
      getStore: () => ({ get: async (key) => { edgeReads++; return copy(objects.get(key)); } }),
    },
    "next/cache": {
      revalidatePath: () => {},
      revalidateTag: (tag) => {
        for (const [key, entry] of dataCache) if (entry.tags.includes(tag)) dataCache.delete(key);
      },
      unstable_cache: (fn, keys, options) => async () => {
        const key = JSON.stringify(keys);
        if (!dataCache.has(key)) dataCache.set(key, { value: await fn(), tags: options.tags });
        return copy(dataCache.get(key).value);
      },
    },
    "next/headers": {
      cookies: async () => ({
        get: (name) => cookieJar.get(name),
        getAll: () => [...cookieJar.values()],
        set: (name, value, options) => cookieJar.set(name, { name, value, ...options }),
        delete: (name) => cookieJar.delete(name),
      }),
      headers: async () => new Headers({ host: "localhost:3000" }),
    },
    "next/navigation": { redirect: (url) => { throw new Error(`REDIRECT:${url}`); } },
    react: { cache: (fn) => fn },
    "@/lib/markdown": {
      extractSearchEntry: (markdown) => ({ headings: [], text: markdown }),
      renderMarkdown: (markdown) => ({ html: markdown }),
    },
  };
  function load(name) {
    if (mocks[name]) return mocks[name];
    if (!name.startsWith("@/")) return loadDependency(name);
    if (modules.has(name)) return modules.get(name).exports;
    const filename = path.join(root, `${name.slice(2)}.ts`);
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const sourceModule = { exports: {} };
    modules.set(name, sourceModule);
    const context = vm.createContext({
      module: sourceModule, exports: sourceModule.exports, require: load, Buffer, Date: Clock,
      process: { env: { NODE_ENV: "development", ROOT_DOMAIN: "localhost" } },
      structuredClone, FormData, File, Response, Headers,
      console: { ...console, error: (...args) => errors.push(args) },
    });
    new vm.Script(output, { filename }).runInContext(context);
    return sourceModule.exports;
  }
  const manage = load("@/lib/manage");
  const site = load("@/lib/site");
  const access = load("@/lib/access");
  const actions = load("@/app/admin/actions");
  const { keys } = load("@/lib/keys");
  return {
    objects, cookieJar, manage, site, access, actions, keys, load, errors,
    advance: (ms) => { now += ms; },
    edgeReads: () => edgeReads,
    failNextWrite: (key) => { failWrite = key; },
    config: (handle) => copy(objects.get(keys.site(handle))),
  };
}

function form(fields) {
  const result = new FormData();
  for (const [key, value] of Object.entries(fields)) result.set(key, value);
  return result;
}

const TTL = 24 * 60 * 60 * 1000;

test("自选和随机前缀均为 24h 体验站，编辑 Cookie 同步到期", async () => {
  const f = fixture();
  const custom = await f.manage.createSite("Acme", "acme");
  const random = await f.manage.createSite("Random");
  assert.equal(custom, "acme");
  assert.match(random, /^try-[a-z0-9]{6}$/);
  for (const handle of [custom, random]) {
    const config = f.config(handle);
    assert.equal(config.expiresAt - config.createdAt, TTL);
    assert.equal(f.site.isTemporary(config), true);
    assert.equal(f.cookieJar.get(`edit_${handle}`).maxAge, TTL / 1000);
  }
});

test("重复前缀不覆盖站点或编辑凭证；非法及保留前缀被拒绝", async () => {
  const f = fixture();
  await f.manage.createSite("Original", "acme");
  const original = f.config("acme");
  const auth = f.objects.get(f.keys.auth("acme"));
  await assert.rejects(f.manage.createSite("Other", "acme"), /已被占用/);
  assert.deepEqual(f.config("acme"), original);
  assert.deepEqual(f.objects.get(f.keys.auth("acme")), auth);
  for (const handle of ["www", "admin", "api", "app", "-abc", "abc-", "a.b", "a".repeat(33)]) {
    await assert.rejects(f.manage.createSite("Invalid", handle), /域名前缀/);
  }
});

test("站点名称允许重复，仅域名前缀检查占用且重试不覆盖原站点", async () => {
  const f = fixture();
  await f.manage.createSite("同名文档站", "acme");
  const auth = structuredClone(f.objects.get(f.keys.auth("acme")));
  const conflict = await f.actions.createSiteAction({}, form({ name: "同名文档站", handle: "ACME" }));
  assert.match(conflict.error, /域名前缀已被占用/);
  const english = await f.actions.createSiteAction({}, form({ name: "Same", handle: "acme", language: "en" }));
  assert.match(english.error, /already taken/);
  const reserved = await f.actions.createSiteAction({}, form({ name: "Same", handle: "admin", language: "en" }));
  assert.match(reserved.error, /reserved name/);
  assert.deepEqual(f.objects.get(f.keys.auth("acme")), auth);
  await assert.rejects(f.actions.createSiteAction(conflict, form({ name: "同名文档站", handle: "acme-two" })), /REDIRECT:\/admin\/acme-two$/);
  assert.equal(f.config("acme").name, "同名文档站");
  assert.equal(f.config("acme-two").name, "同名文档站");
  const random = await f.manage.createSite("同名文档站");
  assert.equal(f.config(random).name, "同名文档站");
});

test("建站 Action 规范化前缀大小写", async () => {
  const f = fixture();
  await assert.rejects(f.actions.createSiteAction({}, form({ name: "Acme", handle: " AcMe " })), /REDIRECT:\/admin\/acme$/);
  assert.equal(f.config("acme").expiresAt - f.config("acme").createdAt, TTL);
});

test("过期前缀可复用，旧凭证、域名、内容和过期标记不会污染新实例", async () => {
  const f = fixture();
  await f.manage.createSite("Old", "acme");
  const old = f.config("acme");
  const oldCookie = f.cookieJar.get("edit_acme");
  await f.manage.addSiteDomain("acme", old.version, "docs.acme.test");
  f.objects.set(f.keys.page("acme", "old-page"), { markdown: "private old content" });
  f.advance(TTL);
  await f.manage.createSite("New", "acme");
  assert.equal(f.config("acme").name, "New");
  assert.equal(f.objects.has(f.keys.page("acme", "old-page")), false);
  assert.equal(f.objects.has(f.keys.domain("docs.acme.test")), false);
  assert.equal(f.objects.has(f.keys.expiry(old.expiresAt, "acme")), false);
  const newCookie = f.cookieJar.get("edit_acme");
  f.cookieJar.set("edit_acme", oldCookie);
  assert.equal(await f.access.hasSiteAccess("acme"), false);
  f.cookieJar.set("edit_acme", newCookie);
  assert.equal(await f.access.hasSiteAccess("acme"), true);
});

test("旧过期标记不能清理复用后的新站点", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  const staleKey = f.keys.expiry(f.config("acme").expiresAt - TTL, "acme");
  f.objects.set(staleKey, {});
  await f.manage.createSite("Another", "another");
  assert.equal(f.config("acme").name, "Acme");
  assert.equal(f.objects.has(staleKey), false);
});

test("体验站添加域名不延长有效期，域名和平台前缀均检查占用", async () => {
  const f = fixture();
  await f.manage.createSite("A", "alpha");
  await f.manage.createSite("B", "beta");
  const expiresAt = f.config("alpha").expiresAt;
  const result = await f.actions.addDomainAction(form({ handle: "alpha", version: 1, host: " DOCS.ACME.TEST. " }));
  assert.equal(result.message, "自定义域名已登记");
  assert.equal(result.site.version, 2);
  assert.deepEqual(result.site.domains, ["docs.acme.test"]);
  assert.equal(f.config("alpha").expiresAt, expiresAt);
  assert.equal((await f.site.resolveSite("docs.acme.test")).handle, "alpha");
  await assert.rejects(f.manage.addSiteDomain("beta", 1, "docs.acme.test"), /已被占用/);
  await assert.rejects(f.manage.addSiteDomain("alpha", 2, "docs.acme.test"), /当前站点/);
  for (const host of ["localhost", "alpha.localhost", "https://docs.acme.test", "docs.acme.test:3000", "invalid"])
    await assert.rejects(f.manage.addSiteDomain("beta", 1, host));
});

test("域名 Action 拒绝跨站编辑和移除", async () => {
  const f = fixture();
  await f.manage.createSite("A", "alpha");
  await f.manage.createSite("B", "beta");
  await f.manage.addSiteDomain("alpha", 1, "docs.acme.test");
  f.cookieJar.delete("edit_alpha");
  const added = await f.actions.addDomainAction(form({ handle: "alpha", version: 2, host: "other.acme.test" }));
  const removed = await f.actions.removeDomainAction(form({ handle: "alpha", version: 2, host: "docs.acme.test" }));
  const foreign = await f.actions.removeDomainAction(form({ handle: "beta", version: 1, host: "docs.acme.test" }));
  assert.equal(added.error, "操作失败，请稍后重试");
  assert.equal(removed.error, "操作失败，请稍后重试");
  assert.match(foreign.error, /不属于当前站点/);
  assert.equal(f.objects.has(f.keys.domain("other.acme.test")), false);
  assert.equal(f.objects.get(f.keys.domain("docs.acme.test")).handle, "alpha");
  assert.equal(f.errors.length, 2);
  assert.ok(f.errors.every(([error]) => error.message === "Forbidden"));
});

test("移除域名会同时撤销映射和缓存，子域名仍可用", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  await f.manage.addSiteDomain("acme", 1, "docs.acme.test");
  assert.ok(await f.site.resolveSite("docs.acme.test"));
  const removed = await f.actions.removeDomainAction(form({ handle: "acme", version: 2, host: "docs.acme.test" }));
  assert.equal(removed.message, "自定义域名已移除");
  assert.equal(removed.site.version, 3);
  assert.equal(removed.site.domains.length, 0);
  assert.equal(await f.site.resolveSite("docs.acme.test"), null);
  assert.ok(await f.site.resolveSite("acme"));
});

test("过期域名可被其他站点接管，旧站点清理不删除新映射", async () => {
  const f = fixture();
  await f.manage.createSite("Old", "old");
  await f.manage.addSiteDomain("old", 1, "docs.acme.test");
  f.advance(TTL - 1000);
  await f.manage.createSite("New", "new");
  f.advance(1000);
  await f.manage.addSiteDomain("new", 1, "docs.acme.test");
  await f.manage.deleteSite("old");
  assert.equal((await f.site.resolveSite("docs.acme.test")).handle, "new");
});

test("版本冲突和站点配置写入失败不留下域名映射", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  await assert.rejects(f.manage.addSiteDomain("acme", 0, "docs.acme.test"), /刷新/);
  assert.equal(f.objects.has(f.keys.domain("docs.acme.test")), false);
  f.failNextWrite(f.keys.site("acme"));
  await assert.rejects(f.manage.addSiteDomain("acme", 1, "docs.acme.test"), /storage unavailable/);
  assert.equal(f.objects.has(f.keys.domain("docs.acme.test")), false);
  assert.equal(f.config("acme").domains.length, 0);
});

test("即使数据已缓存，24h 边界后子域名、自有域名和读取接口全部失效", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  await f.manage.addSiteDomain("acme", 1, "docs.acme.test");
  const routes = ["search.json", "sitemap.xml", "robots.txt"].map((route) => f.load(`@/app/s/[site]/${route}/route`));
  f.advance(TTL - 1);
  for (const name of ["acme", "docs.acme.test"]) {
    assert.ok(await f.site.resolveSite(name));
    for (const route of routes) {
      assert.equal(route.dynamic, "force-dynamic");
      assert.equal((await route.GET(new Request("https://docs.acme.test/"), { params: Promise.resolve({ site: name }) })).status, 200);
    }
  }
  f.advance(1);
  for (const name of ["acme", "docs.acme.test"]) {
    assert.equal(await f.site.resolveSite(name), null);
    for (const route of routes)
      assert.equal((await route.GET(new Request("https://docs.acme.test/"), { params: Promise.resolve({ site: name }) })).status, 404);
  }
  await assert.rejects(f.access.requireEditableSite("acme"), /已过期/);
});

test("设置连续操作返回最新版本，无需页面跳转且不覆盖其他配置", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  const icon = f.config("acme").icon;
  const saved = await f.actions.appearanceAction(form({
    handle: "acme", version: 1, name: "Updated", description: "Saved description", theme: "teal", icon,
  }));
  assert.equal(saved.message, "外观已保存");
  assert.equal(saved.site.version, 2);
  assert.equal(saved.site.name, "Updated");
  const added = await f.actions.addDomainAction(form({ handle: "acme", version: saved.site.version, host: "docs.acme.test" }));
  assert.equal(added.site.version, 3);
  assert.equal(added.site.theme, "teal");
  assert.equal(added.site.description, "Saved description");
  const removed = await f.actions.removeDomainAction(form({ handle: "acme", version: added.site.version, host: "docs.acme.test" }));
  assert.equal(removed.site.version, 4);
  const rebuilt = await f.actions.rebuildSearchAction(form({ handle: "acme" }));
  assert.equal(rebuilt.message, "搜索索引已重建");
  assert.equal(f.config("acme").version, 4);
  const conflict = await f.actions.appearanceAction(form({ handle: "acme", version: 1, name: "Stale", theme: "blue", icon }));
  assert.match(conflict.error, /刷新/);
  assert.equal(f.config("acme").name, "Updated");
});

test("体验站正文大小限制，保存外观会清掉旧数据里的 logo", async () => {
  const f = fixture();
  await f.manage.createSite("Acme", "acme");
  const slug = Object.keys(f.load("@/lib/samples").SAMPLE_PAGES)[0];
  const saved = await f.actions.savePageAction({ version: 1 }, form({
    handle: "acme", slug, version: 1, title: "Page", markdown: "x".repeat(50 * 1024 + 1),
  }));
  assert.match(saved.error, /50 KB/);
  f.objects.set(f.keys.site("acme"), { ...f.config("acme"), logo: "/assets/acme/012345678901234567890123.png" });
  const appearance = await f.actions.appearanceAction(form({
    handle: "acme", version: 1, name: "Acme", description: "", theme: "blue", icon: f.config("acme").icon,
  }));
  assert.equal(appearance.site.logo, undefined);
  assert.equal("logo" in f.config("acme"), false);
});

test("边缘门禁记住有效站点 10 秒：删除最多延迟 10 秒，到期仍然精确，不存在的站点不记", async () => {
  const f = fixture();
  const { resolveLiveSiteAtEdge } = f.load("@/lib/lifecycle-edge");
  const resolve = async (identifier) => {
    const { site, source } = await resolveLiveSiteAtEdge(identifier);
    return site ? `${site.handle}:${source}` : null;
  };
  await f.manage.createSite("Acme", "acme");
  await f.manage.addSiteDomain("acme", 1, "docs.acme.test");

  assert.equal(await resolve("acme"), "acme:blob");
  assert.equal(await resolve("docs.acme.test"), "acme:blob");
  const reads = f.edgeReads();
  assert.equal(await resolve("acme"), "acme:memory");
  assert.equal(await resolve("docs.acme.test"), "acme:memory");
  assert.equal(f.edgeReads(), reads);

  await f.manage.deleteSite("acme");
  f.advance(9999);
  assert.equal(await resolve("acme"), "acme:memory");
  f.advance(1);
  assert.equal(await resolve("acme"), null);
  assert.equal(await resolve("docs.acme.test"), null);

  assert.equal(await resolve("ghost"), null);
  await f.manage.createSite("Ghost", "ghost");
  assert.equal(await resolve("ghost"), "ghost:blob");

  f.advance(TTL - 5000);
  assert.equal(await resolve("ghost"), "ghost:blob");
  f.advance(5000);
  assert.equal(await resolve("ghost"), null);
});

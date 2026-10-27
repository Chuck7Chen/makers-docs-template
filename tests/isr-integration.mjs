import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(path.join(root, ".next"), { recursive: true });
await mkdir(path.join(root, ".blob-local"), { recursive: true });
const buildDir = await mkdtemp(path.join(root, ".next/isr-test-"));
const storeDir = await mkdtemp(path.join(root, ".blob-local/isr-test-"));
const env = {
  ...process.env,
  NEXT_DIST_DIR: path.relative(root, buildDir),
  DOCS_LOCAL_STORE_PATH: path.relative(root, storeDir),
  ROOT_DOMAIN: "localhost",
  EDGEONE_PREVIEW_ASSET_PREFIX: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
const next = path.join(root, "node_modules/next/dist/bin/next");

async function runBuild() {
  const patch = spawn(process.execPath, ["scripts/patch-next-isr.mjs"], { cwd: root, env, stdio: "inherit" });
  await new Promise((resolve, reject) => {
    patch.once("error", reject);
    patch.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ISR patch failed: ${code}`)));
  });
  const child = spawn(process.execPath, [next, "build"], { cwd: root, env, stdio: "inherit" });
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Build failed: ${code}`)));
  });
}

async function writeJSON(key, value) {
  const file = path.join(storeDir, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
}

const configs = new Map();
const tokens = new Map();
async function seed(handle, domains = []) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const config = {
    handle, name: `ISR ${handle}`, description: "", icon: "book-open", theme: "blue", domains,
    nav: [{ title: "Overview", slug: "index" }, { title: "Topic", slug: "topic" }],
    createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000, version: 1,
  };
  configs.set(handle, config);
  tokens.set(handle, token);
  await writeJSON(`sites/${handle}/site.json`, config);
  await writeJSON(`sites/${handle}/auth.json`, { tokenHash: createHash("sha256").update(token).digest("hex") });
  for (const slug of ["index", "topic"]) {
    await writeJSON(`sites/${handle}/pages/${slug}.json`, { markdown: `# ${handle}-${slug}-original`, description: "", updatedAt: now });
  }
  await writeJSON(`sites/${handle}/search.json`, {
    index: { headings: [], text: `${handle}-index-original` }, topic: { headings: [], text: `${handle}-topic-original` },
  });
  for (const domain of domains) await writeJSON(`domains/${domain}.json`, { handle, siteCreatedAt: now });
}

// next build adds the temporary distDir's types to tsconfig.json; restore it after the build
const tsconfigPath = path.join(root, "tsconfig.json");
const tsconfig = await readFile(tsconfigPath, "utf8");
try {
  await runBuild();
} finally {
  await writeFile(tsconfigPath, tsconfig);
}
await seed("alpha", ["docs.acme.test"]);
await seed("beta");
const manifest = JSON.parse(await readFile(path.join(buildDir, "server/server-reference-manifest.json"), "utf8"));
const actions = Object.fromEntries(Object.entries(manifest.node).map(([id, value]) => [value.exportedName, id]));
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "localhost", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const server = spawn(process.execPath, [next, "start", "--hostname", "localhost", "--port", String(port)], {
  cwd: root, env, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (data) => { logs += data; });
server.stderr.on("data", (data) => { logs += data; });
const base = `http://localhost:${port}`;

async function request(host, pathname = "/", options = {}) {
  const encoded = new Request(`${base}${pathname}`, options);
  const bytes = encoded.body ? Buffer.from(await encoded.arrayBuffer()) : undefined;
  return new Promise((resolve, reject) => {
    const outgoing = http.request(`${base}${pathname}`, {
      method: encoded.method,
      headers: { ...Object.fromEntries(encoded.headers), host: `${host}:${port}` },
      signal: AbortSignal.timeout(15000),
    }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("error", reject);
      incoming.on("end", () => resolve(new Response(Buffer.concat(chunks), {
        status: incoming.statusCode,
        headers: Object.fromEntries(Object.entries(incoming.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value])),
      })));
    });
    outgoing.on("error", reject);
    outgoing.end(bytes);
  });
}

async function page(host, pathname = "/") {
  const response = await request(host, pathname);
  return { response, html: await response.text() };
}

async function action(name, handle, fields, previous) {
  assert.ok(actions[name], `Missing action ${name}`);
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(`_1_${key}`, String(value));
  body.set("0", JSON.stringify(previous === undefined ? ["$K1"] : [previous, "$K1"]));
  const response = await request("localhost", `/admin/${handle}/edit/index`, {
    method: "POST", body,
    headers: {
      "Next-Action": actions[name],
      origin: `http://localhost:${port}`,
      cookie: `edit_${handle}=${tokens.get(handle)}`,
    },
  });
  const payload = await response.text();
  const redirect = response.headers.get("x-action-redirect");
  if (redirect) {
    assert.ok(!decodeURIComponent(redirect).includes("error="), `${name}: ${decodeURIComponent(redirect)}`);
    return redirect;
  }
  assert.equal(response.status, 200, `${name}: ${payload.slice(0, 800)}`);
  // Only check the Action's own result line; revalidatePath also streams the re-rendered page tree
  const result = payload.match(/^1:(.*)$/m)?.[1];
  assert.ok(result, `${name}: missing action result`);
  assert.ok(!JSON.parse(result)?.error, `${name}: ${result}`);
  return result;
}

try {
  for (let attempt = 0; attempt < 100 && !logs.includes("Ready in"); attempt++) {
    assert.equal(server.exitCode, null, logs);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(logs.includes("Ready in"), logs);

  const first = await page("alpha.localhost");
  assert.equal(first.response.status, 200);
  assert.match(first.html, /alpha-index-original/);
  assert.equal(first.response.headers.get("x-nextjs-cache"), "MISS");
  const second = await page("alpha.localhost");
  assert.equal(second.response.headers.get("x-nextjs-cache"), "HIT");
  assert.equal(second.html, first.html);
  assert.match(second.response.headers.get("cache-control"), /no-store/);
  assert.equal(second.response.headers.get("cdn-cache-control"), "no-store");
  await page("docs.acme.test");
  const beta = await page("beta.localhost");
  assert.match(beta.html, /beta-index-original/);
  console.log("PASS: full HTML MISS → HIT; downstream caches cannot bypass the gate");

  await writeJSON("sites/alpha/pages/index.json", { markdown: "# raw-blob-change", description: "", updatedAt: Date.now() });
  const unchanged = await page("alpha.localhost");
  assert.equal(unchanged.response.headers.get("x-nextjs-cache"), "HIT");
  assert.match(unchanged.html, /alpha-index-original/);
  assert.ok(!unchanged.html.includes("raw-blob-change"));
  console.log("PASS: raw Blob changes do not silently regenerate indefinite HTML caches");

  const saved = await action("savePageAction", "alpha", {
    handle: "alpha", slug: "index", title: "Overview", description: "", markdown: "# saved-new-content", version: 1,
  }, { version: 1 });
  assert.match(saved, /savedAt/);
  for (const host of ["alpha.localhost", "docs.acme.test"]) {
    const updated = await page(host);
    assert.match(updated.html, /saved-new-content/);
    assert.ok(!updated.html.includes("alpha-index-original"));
    assert.equal((await page(host)).response.headers.get("x-nextjs-cache"), "HIT");
  }
  const betaAfter = await page("beta.localhost");
  assert.equal(betaAfter.response.headers.get("x-nextjs-cache"), "HIT");
  assert.equal(betaAfter.html, beta.html);
  console.log("PASS: real save action refreshes subdomain and custom-domain HTML, without invalidating beta");

  const missing = await page("alpha.localhost", "/created");
  assert.equal(missing.response.status, 404);
  await action("createPageAction", "alpha", { handle: "alpha", slug: "created", title: "Created", version: 1 });
  const created = await page("alpha.localhost", "/created");
  assert.equal(created.response.status, 200);
  assert.match(created.html, /Created/);
  console.log("PASS: creating a document invalidates its previously cached 404");

  await action("removeDomainAction", "alpha", { handle: "alpha", host: "docs.acme.test", version: 2 });
  assert.equal((await page("docs.acme.test")).response.status, 404);
  assert.equal((await page("alpha.localhost")).response.status, 200);
  await action("addDomainAction", "alpha", { handle: "alpha", host: "docs.acme.test", version: 3 });
  assert.equal((await page("docs.acme.test")).response.status, 200);
  console.log("PASS: unbind/rebind revokes stale custom-domain pages and regenerates them");

  const config = JSON.parse(await readFile(path.join(storeDir, "sites/alpha/site.json"), "utf8"));
  config.expiresAt = Date.now() - 1;
  await writeJSON("sites/alpha/site.json", config);
  for (const host of ["alpha.localhost", "docs.acme.test"]) {
    for (const pathname of ["/", "/topic", "/created", "/search.json", "/sitemap.xml", "/robots.txt"]) {
      const expired = await request(host, pathname);
      assert.equal(expired.status, 404, `${host}${pathname}`);
      assert.match(expired.headers.get("cache-control"), /no-store/);
    }
  }
  assert.equal((await request("localhost", "/assets/alpha/012345678901234567890123.png")).status, 404);
  console.log("PASS: cached HTML is blocked immediately after expiry on both domains and read endpoints");

  await action("deleteSiteAction", "beta", { handle: "beta" });
  assert.equal((await page("beta.localhost")).response.status, 404);
  assert.equal((await request("localhost", "/s/beta")).status, 404);
  console.log("PASS: real delete action blocks previously cached HTML; internal routes are not public");
} catch (error) {
  console.error(logs.slice(-6000));
  throw error;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once("exit", resolve);
    setTimeout(() => { server.kill("SIGKILL"); resolve(); }, 5000).unref();
  });
  console.log(`Isolated build: ${path.relative(root, buildDir)}; isolated store: ${path.relative(root, storeDir)}`);
}

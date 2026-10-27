import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const loadDependency = createRequire(import.meta.url);
const packagePath = loadDependency.resolve("next/package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
const original = "const prerenderInfo = routeModule.match(pathname, prerenderManifest);";
const corrected = "const prerenderInfo = routeModule.match(resolvedPathname, prerenderManifest);";

if (version !== "15.5.27") {
  throw new Error(`Recheck rewritten ISR routing before changing Next.js ${version}; this patch targets 15.5.27`);
}
for (const template of ["dist/build/templates/app-page.js", "dist/esm/build/templates/app-page.js"]) {
  const file = path.join(path.dirname(packagePath), template);
  const source = await readFile(file, "utf8");
  if (source.includes(corrected)) continue;
  if (source.split(original).length !== 2) throw new Error(`Unexpected Next.js ISR template: ${template}`);
  await writeFile(file, source.replace(original, corrected));
}
console.log("Next.js 15.5.27 rewritten-path ISR compatibility patch ready");

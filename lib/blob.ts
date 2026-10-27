import { getStore, type Store, type StoreOptions } from "@edgeone/pages-blob";
import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Plain npm run dev has no Blob credentials, so data goes to .blob-local/; deployments and edgeone makers dev use the real Blob store
const localOverride = process.env.DOCS_LOCAL_STORE_PATH;
const useLocal = !!localOverride || (process.env.NODE_ENV === "development" && !process.env.PAGES_BLOB_DEPLOY_CREDENTIAL);
// Keep the two branches separate: with resolve(cwd, override || ".blob-local"), Next's file tracing pulls the whole project (including .env and .git) into the cloud function
const LOCAL_ROOT = localOverride ? path.resolve(localOverride) : path.join(process.cwd(), ".blob-local");
if (useLocal && !LOCAL_ROOT.startsWith(`${process.cwd()}${path.sep}`)) {
  throw new Error("Local Blob storage must be inside the project directory");
}

let store: Store | undefined;

// There are no credentials at build time and getStore would throw, so create the store on first use
function remote() {
  // The types require projectId and token; on Makers the SDK reads deployment credentials itself
  store ??= getStore({ name: "docs", consistency: "strong" } as StoreOptions);
  return store;
}

export async function readJSON<T>(key: string): Promise<T | null> {
  if (useLocal) {
    const bytes = await localRead(key);
    return bytes ? (JSON.parse(bytes.toString("utf8")) as T) : null;
  }
  return (await remote().get(key, { type: "json" })) as T | null;
}

export async function readBytes(key: string): Promise<ArrayBuffer | null> {
  if (useLocal) {
    const bytes = await localRead(key);
    return bytes ? new Uint8Array(bytes).buffer : null;
  }
  return remote().get(key, { type: "arrayBuffer" });
}

export async function writeJSON(key: string, value: unknown) {
  if (useLocal) return localWrite(key, JSON.stringify(value));
  await remote().setJSON(key, value);
}

export async function writeBytes(key: string, value: ArrayBuffer) {
  if (useLocal) return localWrite(key, new Uint8Array(value));
  await remote().set(key, value);
}

export async function remove(key: string) {
  if (useLocal) return localRemove(key);
  await remote().delete(key);
}

// prefix ends with /; returns the full keys of all objects under it
export async function listKeys(prefix: string): Promise<string[]> {
  if (useLocal) return localList(prefix);
  const { blobs } = await remote().list({ prefix });
  return blobs.map((blob) => blob.key);
}

// prefix ends with /; returns the next directory level, such as sites/acme/
export async function listDirs(prefix: string): Promise<string[]> {
  if (useLocal) {
    const entries = await localEntries(localPath(prefix));
    return entries.filter((entry) => entry.isDirectory()).map((entry) => `${prefix}${entry.name}/`);
  }
  const { directories } = await remote().list({ prefix, directories: true });
  return directories;
}

function localPath(key: string) {
  return path.join(LOCAL_ROOT, ...key.split("/"));
}

async function localRead(key: string) {
  try {
    return await readFile(localPath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function localWrite(key: string, data: string | Uint8Array) {
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

// Blob directories are just key prefixes and vanish when empty; remove empty local directories too so listDirs skips deleted sites
async function localRemove(key: string) {
  const file = localPath(key);
  await rm(file, { force: true });
  for (let dir = path.dirname(file); dir !== LOCAL_ROOT; dir = path.dirname(dir)) {
    try {
      await rmdir(dir);
    } catch {
      return;
    }
  }
}

function localEntries(dir: string): Promise<Dirent[]> {
  return readdir(dir, { withFileTypes: true }).catch(() => []);
}

async function localList(prefix: string) {
  const keys: string[] = [];
  async function walk(dir: string, base: string) {
    for (const entry of await localEntries(dir)) {
      const key = base + entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), `${key}/`);
      else keys.push(key);
    }
  }
  await walk(localPath(prefix), prefix);
  return keys;
}

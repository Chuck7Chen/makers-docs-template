import { getStore, type Store, type StoreOptions } from "@edgeone/pages-blob";
import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

// 直接 npm run dev 时没有 Blob 凭证，改用 .blob-local/ 目录；部署后和 edgeone makers dev 都走真实的 Blob
const useLocal = process.env.NODE_ENV === "development" && !process.env.PAGES_BLOB_DEPLOY_CREDENTIAL;
const LOCAL_ROOT = path.join(process.cwd(), ".blob-local");

let store: Store | undefined;

// 构建时没有凭证，getStore 会抛错，所以第一次读写时才创建
function remote() {
  // 类型要求 projectId 和 token；在 Makers 上 SDK 自己读部署凭证，不需要传
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

// prefix 以 / 结尾，返回其下所有对象的完整 key
export async function listKeys(prefix: string): Promise<string[]> {
  if (useLocal) return localList(prefix);
  const { blobs } = await remote().list({ prefix });
  return blobs.map((blob) => blob.key);
}

// prefix 以 / 结尾，返回下一级目录，形如 sites/acme/
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

// Blob 的目录只是 key 的前缀，删空了就不存在；本地也把空目录删掉，listDirs 才不会列出已删的站点
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

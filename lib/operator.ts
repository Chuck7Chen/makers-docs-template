// 中间件也会引用这个文件，不能依赖 Node API

export const OPERATOR_SESSION_COOKIE = "makers_ops_session";
export const OPERATOR_SESSION_MAX_AGE = 12 * 60 * 60;
const SESSION_VERSION = "v1";

function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function credentials() {
  return {
    username: process.env.ADMIN_USERNAME?.trim() || "admin",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

function readCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

async function sign(value: string, password: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function operatorEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function verifyOperatorCredentials(username: string, password: string) {
  const configured = credentials();
  const usernameMatches = safeEqual(username, configured.username);
  const passwordMatches = safeEqual(password, configured.password);
  return Boolean(configured.password) && usernameMatches && passwordMatches;
}

export async function createOperatorSession() {
  const configured = credentials();
  if (!configured.password) throw new Error("Operator access is not configured");
  const expiresAt = Math.floor(Date.now() / 1000) + OPERATOR_SESSION_MAX_AGE;
  const payload = `${SESSION_VERSION}.${expiresAt}`;
  const signature = await sign(`${payload}.${configured.username}`, configured.password);
  return `${payload}.${signature}`;
}

// Cookie 只保存带过期时间的 HMAC 签名；修改账号或密码会立即让旧会话失效。
export async function isOperator(headers: Pick<Headers, "get">) {
  const configured = credentials();
  if (!configured.password) return false;

  const token = readCookie(headers.get("cookie") ?? "", OPERATOR_SESSION_COOKIE);
  const [version, rawExpiresAt, signature, ...extra] = token.split(".");
  const expiresAt = Number(rawExpiresAt);
  const now = Math.floor(Date.now() / 1000);
  if (
    extra.length > 0 ||
    version !== SESSION_VERSION ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + OPERATOR_SESSION_MAX_AGE
  ) {
    return false;
  }

  const expected = await sign(`${version}.${expiresAt}.${configured.username}`, configured.password);
  return safeEqual(signature, expected);
}

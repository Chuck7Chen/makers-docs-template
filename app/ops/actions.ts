"use server";

import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readJSON, remove, writeJSON } from "@/lib/blob";
import { field, messageOf, UserError } from "@/lib/forms";
import { createSite, deleteSite, updateSite } from "@/lib/manage";
import { isOperator } from "@/lib/operator";
import { isReservedHandle, isValidHandle, isValidHost, isValidName, ROOT_DOMAIN } from "@/lib/rules";
import { isTemporary, keys, type SiteConfig } from "@/lib/site";

// 中间件已经拦过一次，Action 是公开端点，这里再校验一遍
async function requireOperator() {
  if (!(await isOperator(await headers()))) throw new Error("Forbidden");
}

function back(error?: string): never {
  redirect(error ? `/ops?error=${encodeURIComponent(error)}` : "/ops");
}

export async function opsCreateSiteAction(formData: FormData) {
  const handle = field(formData, "handle").toLowerCase();
  let error: string | undefined;
  try {
    await requireOperator();
    const name = field(formData, "name");
    if (!isValidHandle(handle) || isReservedHandle(handle)) {
      throw new UserError("子域名只能用小写字母、数字和连字符，1 到 32 位，不能是 www、admin、api、app");
    }
    if (!isValidName(name)) throw new UserError("站点名称需要 1 到 40 个字");
    await createSite(name, handle);
  } catch (e) {
    error = messageOf(e);
  }
  if (error) back(error);
  redirect(`/admin/${handle}`);
}

export async function opsDeleteSiteAction(formData: FormData) {
  let error: string | undefined;
  try {
    await requireOperator();
    const handle = field(formData, "handle");
    if (!isValidHandle(handle)) throw new UserError("站点不存在");
    await deleteSite(handle);
  } catch (e) {
    error = messageOf(e);
  }
  back(error);
}

// 只登记映射；域名在 Makers 控制台绑定到项目、DNS 指向平台，见 README
export async function opsAddDomainAction(formData: FormData) {
  let error: string | undefined;
  try {
    await requireOperator();
    const handle = field(formData, "handle");
    const host = field(formData, "host").toLowerCase().replace(/\.$/, "");
    if (!isValidHost(host)) throw new UserError("域名格式不对，例如 docs.example.com");
    if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) throw new UserError("平台域名下的地址不用登记");
    const site = isValidHandle(handle) ? await readJSON<SiteConfig>(keys.site(handle)) : null;
    if (!site) throw new UserError("站点不存在");
    if (isTemporary(site)) throw new UserError("只有平台管理员创建的长期站点可以登记自有域名");
    // 平台管理操作只有一个人在做，先查再写即可，不考虑并发
    const existing = await readJSON<{ handle: string }>(keys.domain(host));
    if (existing) throw new UserError(`这个域名已登记给 ${existing.handle}`);

    await writeJSON(keys.domain(host), { handle });
    await updateSite(handle, null, (draft) => {
      draft.domains.push(host);
    });
    revalidateTag(`domain:${host}`);
  } catch (e) {
    error = messageOf(e);
  }
  back(error);
}

export async function opsRemoveDomainAction(formData: FormData) {
  let error: string | undefined;
  try {
    await requireOperator();
    const handle = field(formData, "handle");
    const host = field(formData, "host");
    if (!isValidHandle(handle) || !isValidHost(host)) throw new UserError("参数不对");
    const mapping = await readJSON<{ handle: string }>(keys.domain(host));
    if (mapping?.handle === handle) await remove(keys.domain(host));
    await updateSite(handle, null, (draft) => {
      draft.domains = draft.domains.filter((domain) => domain !== host);
    });
    revalidateTag(`domain:${host}`);
  } catch (e) {
    error = messageOf(e);
  }
  back(error);
}

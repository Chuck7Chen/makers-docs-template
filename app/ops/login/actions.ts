"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createOperatorSession,
  OPERATOR_SESSION_COOKIE,
  OPERATOR_SESSION_MAX_AGE,
  verifyOperatorCredentials,
} from "@/lib/operator";

export type OperatorLoginState = { error?: string };

function value(formData: FormData, name: string) {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

export async function operatorLoginAction(
  _previous: OperatorLoginState,
  formData: FormData,
): Promise<OperatorLoginState> {
  const username = value(formData, "username").trim();
  const password = value(formData, "password");
  if (!verifyOperatorCredentials(username, password)) {
    return { error: "管理员账号或密码不正确" };
  }

  const store = await cookies();
  store.set(OPERATOR_SESSION_COOKIE, await createOperatorSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/ops",
    maxAge: OPERATOR_SESSION_MAX_AGE,
  });
  redirect("/ops");
}

export async function operatorLogoutAction() {
  const store = await cookies();
  store.set(OPERATOR_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/ops",
    maxAge: 0,
  });
  redirect("/ops/login");
}

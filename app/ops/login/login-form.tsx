"use client";

import { CircleAlert, LogIn } from "lucide-react";
import { useActionState } from "react";
import { operatorLoginAction, type OperatorLoginState } from "@/app/ops/login/actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const initialState: OperatorLoginState = {};

export function OperatorLoginForm() {
  const [state, formAction, pending] = useActionState(operatorLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="operator-username">管理员账号</Label>
        <Input
          id="operator-username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          className="h-11 bg-white px-3.5"
          placeholder="请输入管理员账号"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operator-password">管理员密码</Label>
        <Input
          id="operator-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 bg-white px-3.5"
          placeholder="请输入管理员密码"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{state.error}</AlertTitle>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="h-11 w-full rounded-lg shadow-sm">
        {pending ? <Spinner data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
        {pending ? "正在登录…" : "登录平台管理"}
      </Button>
    </form>
  );
}

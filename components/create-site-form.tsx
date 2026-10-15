"use client";

import { useActionState } from "react";
import { createSiteAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const initialState: FormState = {};

export function CreateSiteForm({ language = "zh" }: { language?: "zh" | "en" }) {
  const [state, formAction, pending] = useActionState(createSiteAction, initialState);
  const text =
    language === "en"
      ? { placeholder: "Site name, e.g. Acme Docs", create: "Create site", creating: "Creating…" }
      : { placeholder: "站点名称，例如 Acme 开发文档", create: "创建站点", creating: "正在创建…" };

  return (
    <form action={formAction}>
      <input type="hidden" name="language" value={language} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          required
          maxLength={40}
          placeholder={text.placeholder}
          aria-label={text.placeholder}
          className="h-11 rounded-lg bg-white px-3.5 shadow-xs sm:flex-1"
        />
        <Button type="submit" size="lg" disabled={pending} className="h-11 rounded-lg px-5 shadow-sm">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? text.creating : text.create}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

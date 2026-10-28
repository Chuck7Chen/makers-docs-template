"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createSiteAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const initialState: FormState = {};

const TEXT = {
  zh: {
    name: "站点名称",
    namePlaceholder: "Acme 开发文档",
    prefix: "域名前缀",
    hint: "可选，留空随机分配",
    create: "创建站点",
    creating: "正在创建…",
  },
  en: {
    name: "Site name",
    namePlaceholder: "Acme Docs",
    prefix: "Subdomain",
    hint: "Optional, random if blank",
    create: "Create site",
    creating: "Creating…",
  },
} as const;

const subscribe = () => () => {};

// The home page is prerendered, so the platform domain is read from the address bar instead of ROOT_DOMAIN;
// middleware only serves the home page at ROOT_DOMAIN and www.ROOT_DOMAIN. Empty until the page hydrates
function usePlatformDomain() {
  return useSyncExternalStore(subscribe, () => location.hostname.replace(/^www\./, ""), () => "");
}

export function CreateSiteForm({ language = "zh" }: { language?: "zh" | "en" }) {
  const [state, formAction, pending] = useActionState(createSiteAction, initialState);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const rootDomain = usePlatformDomain();
  const text = TEXT[language];

  return (
    <form
      action={formAction}
      className="space-y-4"
      onReset={(event) => {
        // React resets the form even when the Server Action returns a validation error; keep the draft so the user can fix it and retry
        event.preventDefault();
      }}
    >
      <input type="hidden" name="language" value={language} />

      <div className="space-y-1.5">
        <Label htmlFor="site-name" className="text-xs text-zinc-700">
          {text.name}
        </Label>
        <Input
          id="site-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={40}
          placeholder={text.namePlaceholder}
          className="h-10 bg-white px-3"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="site-prefix" className="text-xs text-zinc-700">
            {text.prefix}
          </Label>
          <span id="site-prefix-hint" className="text-[11px] text-zinc-400">
            {text.hint}
          </span>
        </div>
        <InputGroup className="h-10 bg-white">
          <InputGroupInput
            id="site-prefix"
            name="handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            maxLength={32}
            pattern="[a-zA-Z0-9]([a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?"
            title={language === "en" ? "1–32 letters, numbers or hyphens" : "1–32 位字母、数字或连字符"}
            placeholder="acme"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="site-prefix-hint"
            className="h-full min-w-0 px-3"
          />
          <InputGroupAddon align="inline-end" className="min-w-0 max-w-[60%] font-normal">
            <span className="truncate font-mono text-xs text-zinc-400">{rootDomain && `.${rootDomain}`}</span>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-full shadow-sm">
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? text.creating : text.create}
      </Button>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

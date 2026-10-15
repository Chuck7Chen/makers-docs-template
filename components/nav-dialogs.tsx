"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createPageAction, navAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";

// pos 是分组在顶层导航里的位置，对应 NavOp 的 target
export type GroupOption = { pos: string; title: string };

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  version: number;
};

// 新建页面成功时 Action 直接跳转到编辑器，没有返回值
type Send = (formData: FormData) => Promise<FormState | undefined>;

function FormDialog({
  open,
  onOpenChange,
  send,
  title,
  description,
  submitText,
  children,
}: Pick<DialogProps, "open" | "onOpenChange"> & {
  send: Send;
  title: string;
  description: string;
  submitText: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  // 不用 form action：React 会在 action 结束后重置表单，出错时填好的内容就没了
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const result = await send(formData);
        if (result?.error) setError(result.error);
        else handleOpenChange(false);
      } catch {
        setError("提交失败，请检查网络后重试");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePageDialog({
  handle,
  version,
  groups,
  group,
  ...props
}: DialogProps & { groups: GroupOption[]; group: string }) {
  return (
    <FormDialog
      {...props}
      send={createPageAction}
      title="新建页面"
      description="创建后进入编辑器。地址建好后不能修改。"
      submitText="创建并编辑"
    >
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="version" value={version} />
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="new-page-title">标题</FieldLabel>
          <Input id="new-page-title" name="title" required maxLength={60} placeholder="例如 快速开始" autoComplete="off" />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-page-slug">地址</FieldLabel>
          <InputGroup>
            <InputGroupAddon>/</InputGroupAddon>
            <InputGroupInput
              id="new-page-slug"
              name="slug"
              required
              maxLength={98}
              placeholder="guide/quick-start"
              autoComplete="off"
              spellCheck={false}
            />
          </InputGroup>
          <FieldDescription>小写字母、数字和连字符，用 / 最多分成三段</FieldDescription>
        </Field>
        {groups.length > 0 ? (
          <Field>
            <FieldLabel htmlFor="new-page-group">放在</FieldLabel>
            <NativeSelect id="new-page-group" name="group" defaultValue={group} className="w-full">
              <NativeSelectOption value="">顶层</NativeSelectOption>
              {groups.map((option) => (
                <NativeSelectOption key={option.pos} value={option.pos}>
                  {option.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </FieldGroup>
    </FormDialog>
  );
}

export function CreateGroupDialog({ handle, version, ...props }: DialogProps) {
  const send: Send = (formData) => navAction(handle, version, { op: "add-group", title: String(formData.get("title") ?? "") });
  return (
    <FormDialog
      {...props}
      send={send}
      title="新建分组"
      description="分组只用来归类，没有自己的页面。建好后从页面菜单的“移动到”把页面放进来。"
      submitText="创建分组"
    >
      <Field>
        <FieldLabel htmlFor="new-group-title">分组名</FieldLabel>
        <Input id="new-group-title" name="title" required maxLength={60} placeholder="例如 进阶" autoComplete="off" />
      </Field>
    </FormDialog>
  );
}

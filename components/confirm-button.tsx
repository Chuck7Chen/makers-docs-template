"use client";

import { useRef, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = ComponentProps<typeof Button> & {
  title: string;
  description: string;
  confirmText?: string;
};

// 放在表单里的危险操作按钮，确认后提交按钮所在的表单
export function ConfirmButton({
  title,
  description,
  confirmText = "删除",
  variant = "destructive",
  disabled,
  children,
  ...props
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button ref={ref} type="button" variant={variant} disabled={pending || disabled} {...props}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => ref.current?.form?.requestSubmit()}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

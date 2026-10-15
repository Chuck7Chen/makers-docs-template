"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SubmitButton({
  pendingText,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

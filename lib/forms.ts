// Errors safe to show to users; anything else shows a generic message
export class UserError extends Error {}

export function messageOf(error: unknown) {
  if (error instanceof UserError) return error.message;
  console.error(error);
  return "操作失败，请稍后重试";
}

export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

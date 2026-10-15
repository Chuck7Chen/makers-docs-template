// 可以直接展示给用户的错误，其他错误只显示通用提示
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

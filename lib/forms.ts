// Errors safe to show to users; anything else shows a generic message.
// The English text is only needed for errors that can reach the bilingual home page
export class UserError extends Error {
  en?: string;

  constructor(message: string, en?: string) {
    super(message);
    this.en = en;
  }
}

export function messageOf(error: unknown, english = false) {
  if (error instanceof UserError) return (english && error.en) || error.message;
  console.error(error);
  return english ? "Something went wrong. Please try again later." : "操作失败，请稍后重试";
}

export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

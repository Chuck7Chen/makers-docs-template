import type { CSSProperties } from "react";

// 站点主题默认使用 TDesign 的腾讯蓝，其余颜色取自 Tailwind 调色板，按明度相近挑选。
// 主色上的白色图标和文字对比度不低于 4.5:1；文字色用于白底上的链接和侧栏当前页
export const THEMES = {
  blue: { label: "腾讯蓝", color: "#0052d9", text: "#0052d9" },
  indigo: { label: "靛蓝", color: "#4f46e5", text: "#4338ca" },
  violet: { label: "紫罗兰", color: "#7c3aed", text: "#6d28d9" },
  pink: { label: "玫红", color: "#be185d", text: "#9d174d" },
  red: { label: "朱红", color: "#dc2626", text: "#b91c1c" },
  orange: { label: "暖橙", color: "#c2410c", text: "#9a3412" },
  green: { label: "翡翠", color: "#15803d", text: "#166534" },
  teal: { label: "青绿", color: "#0f766e", text: "#115e59" },
  cyan: { label: "湖蓝", color: "#0e7490", text: "#155e75" },
  zinc: { label: "石墨", color: "#27272a", text: "#18181b" },
} as const;

export type ThemeName = keyof typeof THEMES;

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
export const DEFAULT_THEME: ThemeName = "blue";

export function isThemeName(value: string): value is ThemeName {
  return Object.hasOwn(THEMES, value);
}

// 不认识的主题名按默认主题处理，比如改版前存的是任意颜色、没有主题名的站点
export function resolveTheme(name: string): ThemeName {
  return isThemeName(name) ? name : DEFAULT_THEME;
}

// 主题写成 CSS 变量，对应 globals.css 里的 bg-brand、text-brand-foreground、text-brand-text
export function brandStyle(name: string) {
  const { color, text } = THEMES[resolveTheme(name)];
  return {
    "--brand": color,
    "--brand-foreground": "#fff",
    "--brand-text": text,
  } as CSSProperties;
}

import type { CSSProperties } from "react";

// The default theme uses TDesign's Tencent Blue; the others come from the Tailwind palette, picked for similar lightness.
// White icons and text on the primary color have at least 4.5:1 contrast; the text color is for links and the current sidebar item on white
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

// Unknown theme names fall back to the default, e.g. older sites that stored an arbitrary color instead of a theme name
export function resolveTheme(name: string): ThemeName {
  return isThemeName(name) ? name : DEFAULT_THEME;
}

// Themes are written as CSS variables used by bg-brand, text-brand-foreground and text-brand-text in globals.css
export function brandStyle(name: string) {
  const { color, text } = THEMES[resolveTheme(name)];
  return {
    "--brand": color,
    "--brand-foreground": "#fff",
    "--brand-text": text,
  } as CSSProperties;
}

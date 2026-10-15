import type { Element, ElementContent, Root, RootContent } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { SearchEntry } from "@/lib/site";

export type Heading = { depth: 2 | 3; id: string; text: string };

// 先净化再加标题锚点和高亮，后两步只产出受控的 id 和 class。
// 正文不允许原始 HTML，净化前的 id 只来自脚注，已经带 user-content- 前缀，不用再加一遍
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { footnoteLabel: "脚注", footnoteBackLabel: "返回正文" })
  .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: "" })
  .use(rehypeSlug)
  .use(rehypeHighlight)
  .use(rehypeStringify)
  .freeze();

function toTree(markdown: string) {
  return processor.runSync(processor.parse(markdown)) as Root;
}

function textOf(node: Root | RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textOf).join("");
  return "";
}

function hasClass(node: Element, name: string) {
  const className = node.properties.className;
  return Array.isArray(className) && className.includes(name);
}

function codeBlock(pre: Element): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["code-block"] },
    children: [
      {
        type: "element",
        tagName: "button",
        properties: { type: "button", className: ["copy-button"], dataCopy: "" },
        children: [{ type: "text", value: "复制" }],
      },
      pre,
    ],
  };
}

// 只保留本站上传的图片，代码块加复制按钮，顺带收集二、三级标题
function transform(parent: Root | Element, imagePrefix: string, headings: Heading[]) {
  const children = (parent.children as ElementContent[]).flatMap((child): ElementContent[] => {
    if (child.type !== "element") return [child];
    if (child.tagName === "img") {
      if (!String(child.properties.src ?? "").startsWith(imagePrefix)) return [];
      child.properties.loading = "lazy";
      return [child];
    }
    if (child.tagName === "pre") return [codeBlock(child)];
    const { id } = child.properties;
    if ((child.tagName === "h2" || child.tagName === "h3") && typeof id === "string" && !hasClass(child, "sr-only")) {
      headings.push({ depth: child.tagName === "h2" ? 2 : 3, id, text: textOf(child) });
    }
    transform(child, imagePrefix, headings);
    return [child];
  });
  (parent as Element).children = children;
}

export function renderMarkdown(markdown: string, handle: string) {
  const tree = toTree(markdown);
  const headings: Heading[] = [];
  transform(tree, `/assets/${handle}/`, headings);
  return { html: processor.stringify(tree), headings };
}

// 搜索索引：二、三级标题和正文前 1000 字
export function extractSearchEntry(markdown: string): SearchEntry {
  const headings: string[] = [];
  const blocks: string[] = [];
  for (const node of toTree(markdown).children) {
    if (node.type !== "element") continue;
    const text = textOf(node).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (node.tagName === "h2" || node.tagName === "h3") headings.push(text);
    blocks.push(text);
  }
  return { headings, text: blocks.join(" ").slice(0, 1000) };
}

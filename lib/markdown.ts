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

// Sanitize before adding heading anchors and highlighting; those steps only emit controlled ids and classes.
// Raw HTML is not allowed, so pre-sanitize ids only come from footnotes, which already carry the user-content- prefix
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

function tableBlock(table: Element): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["table-scroll"], role: "region", tabIndex: 0 },
    children: [table],
  };
}

// Drop images (sites cannot host them), add copy buttons to code blocks, and collect h2/h3 headings
function transform(parent: Root | Element, headings: Heading[]) {
  const children = (parent.children as ElementContent[]).flatMap((child): ElementContent[] => {
    if (child.type !== "element") return [child];
    if (child.tagName === "img") return [];
    if (child.tagName === "pre") return [codeBlock(child)];
    const { id } = child.properties;
    if ((child.tagName === "h2" || child.tagName === "h3") && typeof id === "string" && !hasClass(child, "sr-only")) {
      headings.push({ depth: child.tagName === "h2" ? 2 : 3, id, text: textOf(child) });
    }
    transform(child, headings);
    return [child.tagName === "table" ? tableBlock(child) : child];
  });
  (parent as Element).children = children;
}

export function renderMarkdown(markdown: string) {
  const tree = toTree(markdown);
  const headings: Heading[] = [];
  transform(tree, headings);
  return { html: processor.stringify(tree), headings };
}

// Search index: h2/h3 headings and the first 1000 characters of body text
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

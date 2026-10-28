"use client";

import { cn } from "cn";
import { ArrowLeft, ExternalLink, Eye, SquarePen } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { previewAction, savePageAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  handle: string;
  slug: string;
  path: string;
  viewUrl: string;
  title: string;
  description: string;
  markdown: string;
  version: number;
  // Content size limit for demo sites; null for long-lived sites created by platform admins
  maxBytes: number | null;
};

type Snapshot = { title: string; description: string; markdown: string };

const encoder = new TextEncoder();

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

// The preview renders in an iframe without scripts or same-origin access, reusing the styles already loaded by the admin page
function previewDocument(html: string) {
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'), (node) => node.outerHTML).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">${styles}<style>body{margin:0;padding:24px;background:#fff}</style></head><body><div class="doc">${html}</div></body></html>`;
}

export function Editor(props: Props) {
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description);
  const [markdown, setMarkdown] = useState(props.markdown);
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  const [state, formAction, saving] = useActionState(savePageAction, { version: props.version });

  // After a successful save, record the submitted content as saved to detect unsaved changes
  const [submitted, setSubmitted] = useState<Snapshot | null>(null);
  const [baseline, setBaseline] = useState<Snapshot>({
    title: props.title,
    description: props.description,
    markdown: props.markdown,
  });
  const [seenSavedAt, setSeenSavedAt] = useState(state.savedAt);
  if (state.savedAt !== seenSavedAt) {
    setSeenSavedAt(state.savedAt);
    if (state.savedAt && submitted) setBaseline(submitted);
  }

  const formRef = useRef<HTMLFormElement>(null);

  const bytes = encoder.encode(markdown).length;
  const tooLarge = props.maxBytes !== null && bytes > props.maxBytes;
  const dirty = title !== baseline.title || description !== baseline.description || markdown !== baseline.markdown;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Client-side navigation (tabs, header, back link) never fires beforeunload, so ask before following a link.
    // Capture phase runs before next/link's handler, which skips navigation once the default is prevented
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("有未保存的修改，确定离开吗？")) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!saving && !tooLarge) formRef.current?.requestSubmit();
    }
  }

  function togglePreview() {
    if (preview !== null) {
      setPreview(null);
      return;
    }
    startPreview(async () => {
      const result = await previewAction(props.handle, markdown);
      setNotice(result.error ?? null);
      if (result.html !== undefined) setPreview(previewDocument(result.html));
    });
  }

  let status = null;
  if (state.error) status = <span className="text-destructive">{state.error}</span>;
  else if (dirty) status = <span className="text-muted-foreground">有未保存的修改</span>;
  else if (state.savedAt) {
    status = (
      <span className="text-muted-foreground">
        已保存，
        <a
          href={props.viewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline"
        >
          查看页面
          <ExternalLink className="size-3.5" />
        </a>
      </span>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitted({ title, description, markdown })}
      onKeyDown={onKeyDown}
      className="space-y-4"
    >
      <input type="hidden" name="handle" value={props.handle} />
      <input type="hidden" name="slug" value={props.slug} />
      <input type="hidden" name="version" value={state.version} />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/${props.handle}`}>
            <ArrowLeft data-icon="inline-start" />
            全部页面
          </Link>
        </Button>
        <code className="font-mono text-xs text-muted-foreground">{props.path}</code>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {status}
          {notice ? <span className="text-destructive">{notice}</span> : null}
          <Button type="button" variant="outline" onClick={togglePreview} disabled={previewing}>
            {preview !== null ? <SquarePen data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
            {preview !== null ? "继续编辑" : previewing ? "生成预览…" : "预览"}
          </Button>
          <Button type="submit" disabled={saving || tooLarge}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>

      <Input
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        maxLength={60}
        placeholder="页面标题"
        aria-label="页面标题"
        className="h-10 bg-background font-semibold md:text-base"
      />
      <Input
        name="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={200}
        placeholder="简介，可不填。显示在标题下方，也用作搜索引擎摘要"
        aria-label="页面简介"
        className="bg-background"
      />

      <Textarea
        name="markdown"
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
        spellCheck={false}
        aria-label="正文"
        className={cn("min-h-[60vh] bg-background font-mono leading-6 field-sizing-fixed", preview !== null && "hidden")}
      />
      {preview !== null ? (
        <iframe title="预览" sandbox="" srcDoc={preview} className="h-[60vh] w-full rounded-lg border bg-white" />
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>支持 GitHub 风格的 Markdown，Ctrl+S 或 ⌘S 保存。</span>
        <span className={tooLarge ? "font-medium text-destructive" : ""}>
          {formatBytes(bytes)}
          {props.maxBytes !== null ? ` / ${formatBytes(props.maxBytes)}` : ""}
        </span>
      </div>
    </form>
  );
}

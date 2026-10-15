"use client";

import { cn } from "cn";
import { ArrowLeft, ExternalLink, Eye, ImagePlus, SquarePen } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { previewAction, savePageAction, uploadImageAction } from "@/app/admin/actions";
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
  // 体验站点有正文大小上限，平台管理员创建的长期站点为 null
  maxBytes: number | null;
  // 只有平台管理员创建的长期站点能上传图片，其他为 null
  maxImageBytes: number | null;
};

type Snapshot = { title: string; description: string; markdown: string };

const encoder = new TextEncoder();

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

// 预览放进无脚本、无同源权限的 iframe，样式沿用后台页面已加载的那份
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
  const [uploading, startUpload] = useTransition();
  const [state, formAction, saving] = useActionState(savePageAction, { version: props.version });

  // 保存成功后，把提交时的内容记为“已保存”，用来判断有没有未保存的修改
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bytes = encoder.encode(markdown).length;
  const tooLarge = props.maxBytes !== null && bytes > props.maxBytes;
  const dirty = title !== baseline.title || description !== baseline.description || markdown !== baseline.markdown;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
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

  // 图片单独成段：前后不够一个空行就补上，否则会和相邻文字并成一段
  function insertBlock(text: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? markdown.length;
    const end = textarea?.selectionEnd ?? markdown.length;
    setMarkdown((current) => {
      const before = current.slice(0, start);
      const after = current.slice(end);
      const lead = before ? "\n".repeat(Math.max(0, 2 - /\n*$/.exec(before)![0].length)) : "";
      const tail = "\n".repeat(Math.max(0, (after ? 2 : 1) - /^\n*/.exec(after)![0].length));
      return before + lead + text + tail + after;
    });
  }

  function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || props.maxImageBytes === null) return;
    if (file.size > props.maxImageBytes) {
      setNotice(`图片不能超过 ${props.maxImageBytes / 1024 / 1024} MB`);
      return;
    }
    const data = new FormData();
    data.set("file", file);
    startUpload(async () => {
      const result = await uploadImageAction(props.handle, data);
      setNotice(result.error ?? null);
      if (result.url) insertBlock(`![${file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "")}](${result.url})`);
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
          <a href={`/admin/${props.handle}`}>
            <ArrowLeft data-icon="inline-start" />
            全部页面
          </a>
        </Button>
        <code className="font-mono text-xs text-muted-foreground">{props.path}</code>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {status}
          {notice ? <span className="text-destructive">{notice}</span> : null}
          <Button type="button" variant="outline" onClick={togglePreview} disabled={previewing}>
            {preview !== null ? <SquarePen data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
            {preview !== null ? "继续编辑" : previewing ? "生成预览…" : "预览"}
          </Button>
          {props.maxImageBytes !== null ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || preview !== null}
            >
              <ImagePlus data-icon="inline-start" />
              {uploading ? "上传中…" : "插入图片"}
            </Button>
          ) : null}
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
        ref={textareaRef}
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

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={onPickImage}
      />
    </form>
  );
}

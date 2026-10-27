"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

type Entry = { url: string; title: string; headings: string[]; text: string };
type Result = { url: string; title: string; snippet: string; score: number };

let indexPromise: Promise<Entry[]> | null = null;

// Download the index the first time search opens, once per page
function loadIndex() {
  indexPromise ??= fetch("/search.json")
    .then((response) => (response.ok ? response.json() : { pages: [] }))
    .then((data: { pages: Entry[] }) => data.pages)
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

function snippetAround(text: string, at: number, length: number) {
  const start = Math.max(0, at - 20);
  const end = Math.min(text.length, at + length + 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

// Rank title matches first, then headings, then body text
function search(entries: Entry[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Result[] = [];
  for (const { url, title, headings, text } of entries) {
    if (title.toLowerCase().includes(q)) {
      results.push({ url, title, snippet: text.slice(0, 80), score: 3 });
      continue;
    }
    const heading = headings.find((h) => h.toLowerCase().includes(q));
    if (heading) {
      results.push({ url, title, snippet: heading, score: 2 });
      continue;
    }
    const at = text.toLowerCase().indexOf(q);
    if (at >= 0) results.push({ url, title, snippet: snippetAround(text, at, q.length), score: 1 });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = entries ? search(entries, query) : [];

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    loadIndex().then(setEntries);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((active + step + results.length) % results.length);
    } else if (event.key === "Enter" && results[active]) {
      window.location.href = results[active].url;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-40 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-300 sm:w-56"
      >
        <SearchIcon />
        <span className="flex-1 text-left">搜索文档</span>
        <kbd className="hidden font-sans text-xs text-gray-400 sm:inline">⌘K</kbd>
      </button>

      {/* The header uses backdrop-blur, which makes it the containing block for fixed children, so the dialog is portaled to body */}
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="搜索文档"
                className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
              >
                <div className="flex items-center gap-2 border-b border-gray-200 px-4 text-gray-400">
                  <SearchIcon />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onInputKeyDown}
                    placeholder="搜索标题和正文"
                    className="h-12 flex-1 bg-transparent text-sm text-gray-900 outline-none"
                  />
                  <kbd className="font-sans text-xs">Esc</kbd>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {entries === null ? (
                    <p className="px-3 py-8 text-center text-sm text-gray-500">正在加载索引…</p>
                  ) : !query.trim() ? (
                    <p className="px-3 py-8 text-center text-sm text-gray-500">输入关键词搜索本站</p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-gray-500">没有找到相关内容</p>
                  ) : (
                    <ul>
                      {results.map((result, i) => (
                        <li key={result.url}>
                          <a
                            href={result.url}
                            onMouseEnter={() => setActive(i)}
                            className={`block rounded-lg px-3 py-2 ${i === active ? "bg-gray-100" : ""}`}
                          >
                            <p className="text-sm font-medium text-gray-900">{result.title}</p>
                            {result.snippet ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{result.snippet}</p>
                            ) : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

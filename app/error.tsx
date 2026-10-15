"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-32 text-center">
      <h1 className="text-xl font-semibold">出错了</h1>
      <p className="mt-2 text-sm text-gray-500">请稍后重试。</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        重试
      </button>
    </main>
  );
}

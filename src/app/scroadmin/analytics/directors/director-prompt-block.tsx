"use client";

import { useState } from "react";

// One copyable prompt or rule block inside the director inspector.
export function DirectorPromptBlock({
  title,
  note,
  text,
  defaultOpen = false,
}: {
  title: string;
  note?: string;
  text: string;
  defaultOpen?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details open={defaultOpen} className="rounded-2xl border border-zinc-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#12141c]">{title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{text.length.toLocaleString("zh-HK")} 字</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              void copy();
            }}
            className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#12141c]"
          >
            {copied ? "已複製" : "複製"}
          </button>
        </div>
        {note ? <p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p> : null}
      </summary>
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words border-t border-zinc-100 px-4 py-3 font-mono text-xs leading-5 text-zinc-800">
        {text}
      </pre>
    </details>
  );
}

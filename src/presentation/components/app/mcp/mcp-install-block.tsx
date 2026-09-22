"use client";

import { useState } from "react";

// Copyable install snippet block for MCP client configs.
export function McpInstallBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          className="text-xs font-semibold text-muted hover:text-foreground"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "✓" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-[1rem] bg-accent-ink/5 p-3 text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

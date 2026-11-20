"use client";

// Title bar of the canvas agent dock: language picker, clear, collapse.

import { Bot, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  CANVAS_AGENT_LANGUAGES,
  CANVAS_AGENT_LANGUAGE_LABELS,
  type CanvasAgentLanguage,
} from "@/service/canvas-agent/types";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

export function CanvasAgentHeader({
  copy,
  language,
  collapsed,
  busy,
  hasMessages,
  onLanguageChange,
  onClear,
  onToggleCollapsed,
}: {
  copy: CanvasAgentCopy;
  language: CanvasAgentLanguage;
  collapsed: boolean;
  busy: boolean;
  hasMessages: boolean;
  onLanguageChange: (language: CanvasAgentLanguage) => void;
  onClear: () => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/8 px-3">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        aria-label={collapsed ? copy.expand : copy.collapse}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c6f24b]/15 text-[#c6f24b]">
          <Bot className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-xs font-bold text-white">{copy.title}</span>
      </button>

      <label className="flex items-center gap-1.5 text-[11px] text-white/50">
        <span className="hidden sm:inline">{copy.language}</span>
        <select
          value={language}
          disabled={busy}
          onChange={(event) => onLanguageChange(event.target.value as CanvasAgentLanguage)}
          className="cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none disabled:opacity-50"
        >
          {CANVAS_AGENT_LANGUAGES.map((id) => (
            <option key={id} value={id}>
              {CANVAS_AGENT_LANGUAGE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onClear}
        disabled={busy || !hasMessages}
        title={copy.clear}
        aria-label={copy.clear}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[8px] text-white/50 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggleCollapsed}
        title={collapsed ? copy.expand : copy.collapse}
        aria-label={collapsed ? copy.expand : copy.collapse}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[8px] text-white/50 transition hover:bg-white/8 hover:text-white"
      >
        {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
    </div>
  );
}

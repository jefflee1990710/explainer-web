"use client";

// Title bar of the canvas agent dock: language picker, dock side, clear, collapse.
// On the right, a collapsed dock becomes a slim vertical rail so the canvas stays wide.

import type { ReactNode } from "react";
import { Bot, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, PanelBottom, PanelRight, Trash2 } from "lucide-react";
import {
  CANVAS_AGENT_LANGUAGES,
  CANVAS_AGENT_LANGUAGE_LABELS,
  type CanvasAgentLanguage,
} from "@/service/canvas-agent/types";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

export type CanvasAgentDockSide = "bottom" | "right";

export function CanvasAgentHeader({
  copy,
  language,
  side,
  collapsed,
  busy,
  hasMessages,
  lockSide,
  onLanguageChange,
  onToggleSide,
  onClear,
  onToggleCollapsed,
}: {
  copy: CanvasAgentCopy;
  language: CanvasAgentLanguage;
  side: CanvasAgentDockSide;
  collapsed: boolean;
  busy: boolean;
  hasMessages: boolean;
  lockSide?: boolean;
  onLanguageChange: (language: CanvasAgentLanguage) => void;
  onToggleSide: () => void;
  onClear: () => void;
  onToggleCollapsed: () => void;
}) {
  const sideLabel = side === "bottom" ? copy.moveRight : copy.moveBottom;
  const SideIcon = side === "bottom" ? PanelRight : PanelBottom;
  const CollapseIcon =
    side === "right" ? (collapsed ? ChevronLeft : ChevronRight) : collapsed ? ChevronUp : ChevronDown;

  // A 40px rail cannot fit the language picker, so only the side switch and expand stay.
  if (side === "right" && collapsed) {
    return (
      <div className="flex h-full w-full flex-col items-center gap-1 py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={copy.expand}
          title={copy.expand}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#c6f24b]/15 text-[#c6f24b]"
        >
          <Bot className="h-3.5 w-3.5" />
        </button>
        {lockSide ? null : (
          <IconButton label={sideLabel} onClick={onToggleSide}>
            <SideIcon className="h-3.5 w-3.5" />
          </IconButton>
        )}
        <div className="flex-1" />
        <IconButton label={copy.expand} onClick={onToggleCollapsed}>
          <CollapseIcon className="h-4 w-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/8 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c6f24b]/15 text-[#c6f24b]">
          <Bot className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-xs font-bold text-white">{copy.title}</span>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-white/50">
        <span className={side === "bottom" ? "hidden sm:inline" : "sr-only"}>{copy.language}</span>
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

      {lockSide ? null : (
        <IconButton label={sideLabel} onClick={onToggleSide}>
          <SideIcon className="h-3.5 w-3.5" />
        </IconButton>
      )}
      <IconButton label={copy.clear} onClick={onClear} disabled={busy || !hasMessages}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
      {lockSide ? null : (
        <IconButton label={collapsed ? copy.expand : copy.collapse} onClick={onToggleCollapsed}>
          <CollapseIcon className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
}

// Square icon control shared by the title bar and the collapsed right rail.
function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-white/50 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

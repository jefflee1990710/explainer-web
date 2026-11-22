"use client";

// Prompt tile in the canvas Tools tab. Click or drag it onto the canvas to add a shared prompt node.

import { Type } from "lucide-react";

export const CANVAS_DRAG_PROMPT_MIME = "application/x-scro-canvas-prompt";

export function CanvasPromptTool({
  isZh,
  onAdd,
}: {
  isZh: boolean;
  onAdd: () => void;
}) {
  const label = isZh ? "提示詞" : "Prompt";
  return (
    <div
      draggable
      title={label}
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_PROMPT_MIME, "prompt");
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onAdd}
      className="group flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border border-white/8 bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c6f24b]/12 text-[#c6f24b]">
        <Type className="h-4 w-4" />
      </span>
      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">
        {label}
      </span>
    </div>
  );
}

// Keep the Prompt tile visible unless a category chip is on, or the search misses it.
export function canvasPromptToolVisible(query: string, categoryFiltered: boolean): boolean {
  if (categoryFiltered) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "prompt".includes(q) || "提示詞".includes(q) || q.includes("prompt");
}

"use client";

// Chips above the canvas agent composer for nodes and groups the user right-clicked.

import { X } from "lucide-react";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import {
  contextChipLabel,
  type CanvasAgentContextRef,
} from "@/service/canvas-agent/context-block";

export function CanvasAgentContextChips({
  refs,
  nodes,
  groups,
  isZh,
  onRemove,
}: {
  refs: readonly CanvasAgentContextRef[];
  nodes: readonly CanvasNode[];
  groups: readonly CanvasGroup[];
  isZh: boolean;
  onRemove: (ref: CanvasAgentContextRef) => void;
}) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 border-t border-white/8 px-2.5 pt-2">
      {refs.map((ref) => {
        const label = contextChipLabel(ref, nodes, groups);
        return (
          <span
            key={`${ref.kind}:${ref.id}`}
            title={ref.id}
            className="flex max-w-full items-center gap-1 rounded-lg bg-white/8 py-1 pr-1 pl-2 text-[11px] font-semibold text-white/80"
          >
            <span className="truncate">{label}</span>
            <button
              type="button"
              aria-label={isZh ? `移除 ${label}` : `Remove ${label}`}
              onClick={() => onRemove(ref)}
              className="grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

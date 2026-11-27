"use client";

// Floating actions after a multi-selection: delete the nodes, or drag them as one group.

import { useRef, type PointerEvent } from "react";
import { Move, Trash2 } from "lucide-react";
import { selectionPassedThreshold } from "@/app/app/canvas/canvas-modifier-selection";

export function CanvasMultiSelectMenu({
  isZh,
  count,
  moveArmed,
  canDelete,
  canMove,
  onDelete,
  onToggleMove,
  onMoveStart,
  onMoveBy,
  onMoveEnd,
}: {
  isZh: boolean;
  count: number;
  moveArmed: boolean;
  canDelete: boolean;
  canMove: boolean;
  onDelete: () => void;
  onToggleMove: () => void;
  onMoveStart: () => void;
  onMoveBy: (dx: number, dy: number) => void;
  onMoveEnd: (moved: boolean) => void;
}) {
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !canMove) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    onMoveStart();
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && !selectionPassedThreshold(dx, dy)) return;
    current.moved = true;
    onMoveBy(dx, dy);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.moved) onMoveEnd(true);
    else {
      onMoveEnd(false);
      onToggleMove();
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center">
      <div
        data-canvas-multi-select-menu
        role="toolbar"
        aria-label={isZh ? "多選操作" : "Multi-select actions"}
        className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#12161f]/95 p-1 shadow-2xl backdrop-blur-md"
      >
        <span className="px-2 text-[11px] font-semibold text-white/55">
          {isZh ? `已選 ${count}` : `${count} selected`}
        </span>
        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className="flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isZh ? "刪除" : "Delete"}
        </button>
        <button
          type="button"
          aria-pressed={moveArmed}
          disabled={!canMove}
          title={
            moveArmed
              ? isZh
                ? "在空白處拖曳，整組一起移動"
                : "Drag empty canvas to move the selection"
              : isZh
                ? "按住拖曳可一起移動，或點一下再拖畫布"
                : "Drag to move the selection, or click then drag the canvas"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(event) => event.preventDefault()}
          className={`flex cursor-grab items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-bold active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 ${
            moveArmed ? "bg-[#c6f24b] text-[#11141b]" : "text-white/85 hover:bg-white/10"
          }`}
        >
          <Move className="h-3.5 w-3.5" />
          {isZh ? "移動" : "Move"}
        </button>
      </div>
    </div>
  );
}

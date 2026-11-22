"use client";

// Floating pill over the canvas when several nodes are selected: group them, or ungroup.

import { Group, Ungroup } from "lucide-react";

export function GroupSelectionBar({
  isZh,
  selectedCount,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
}: {
  isZh: boolean;
  selectedCount: number;
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
}) {
  if (!canGroup && !canUngroup) return null;
  const modKey = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl+";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#12161f]/95 p-1 shadow-2xl backdrop-blur-md">
        {canGroup ? (
          <button
            type="button"
            onClick={onGroup}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105"
          >
            <Group className="h-3.5 w-3.5" />
            {isZh ? `將 ${selectedCount} 個節點設為群組` : `Group ${selectedCount} nodes`}
            <span className="font-semibold opacity-60">{modKey}G</span>
          </button>
        ) : null}
        {canUngroup ? (
          <button
            type="button"
            onClick={onUngroup}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Ungroup className="h-3.5 w-3.5" />
            {isZh ? "解散群組" : "Ungroup"}
            <span className="opacity-50">⇧{modKey}G</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

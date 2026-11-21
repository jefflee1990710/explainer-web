"use client";

// Confirms replacing the nodes a previous Explainer plan expanded.

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  isZh: boolean;
  expandedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExplainerReplanDialog({ open, isZh, expandedCount, onCancel, onConfirm }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  // Portal: React Flow nodes sit inside a transformed layer, which would trap `fixed`.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] rounded-2xl border border-white/15 bg-[#10141c] p-4 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "重新規劃分鏡？" : "Re-plan storyboard?"}</div>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          {isZh
            ? `上次展開的 ${expandedCount} 個節點會被刪除，換成新的分鏡。你自己加的節點不受影響。`
            : `The ${expandedCount} nodes from the last plan will be removed and replaced. Nodes you added stay.`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105"
          >
            {isZh ? "重新規劃" : "Re-plan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

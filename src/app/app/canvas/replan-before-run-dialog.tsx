"use client";

// Confirm before a Run whose Director changed since its last plan: Replan (free) first, then run
// this node. Lists the other previews that stay old versions until they run again.

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

export type ReplanBeforeRunItem = { id: string; label: string };

export function ReplanBeforeRunDialog({
  isZh,
  nodeLabel,
  affected,
  onCancel,
  onConfirm,
}: {
  isZh: boolean;
  nodeLabel: string;
  affected: readonly ReplanBeforeRunItem[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  // Escape closes without running anything.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <DialogBackdrop className="grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {isZh ? "導演設定已更改" : "Director settings changed"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh
            ? `會先免費 Replan，用導演最新設定重寫提示詞，然後再生成「${nodeLabel}」。`
            : `The Director replans first (free) with its latest settings, then “${nodeLabel}” runs.`}
        </p>
        {affected.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs text-amber-200/90">
              {isZh
                ? "以下節點之後會變成舊版本，要再 Run 才會更新："
                : "These nodes become old versions and need another Run:"}
            </p>
            <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white/75">
              {affected.map((item) => (
                <li key={item.id} className="truncate">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#d4f76e]"
          >
            {isZh ? "Replan 並重新生成" : "Replan and run"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}

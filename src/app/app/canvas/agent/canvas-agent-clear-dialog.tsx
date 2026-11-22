"use client";

// On-screen confirm before the canvas assistant chat is wiped. Stays open with a spinner while clearing.

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { Spinner } from "@/presentation/components/spinner";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

export function CanvasAgentClearDialog({
  copy,
  clearing,
  error,
  onCancel,
  onConfirm,
}: {
  copy: CanvasAgentCopy;
  clearing: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (clearing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearing, onCancel]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={clearing ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={clearing}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {copy.clearConfirm}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{copy.clearHint}</p>
        {error ? (
          <p role="alert" className="mt-3 text-xs text-red-300">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={clearing}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={clearing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {clearing ? <Spinner className="h-3.5 w-3.5" /> : null}
            {clearing ? copy.clearing : copy.clearAction}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}

"use client";

// Shared modal frame for the canvas tool setup dialogs (Explainer, Talking Head, Swap, …).

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

export const DIALOG_FIELD =
  "nodrag w-full cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1.5 text-[12px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none";

export const DIALOG_TEXTAREA =
  "nodrag nowheel mt-1 w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-[12px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none";

export const DIALOG_LABEL = "flex flex-col gap-1 text-[11px] text-white/55";

type Props = {
  open: boolean;
  isZh: boolean;
  title: string;
  description: string;
  submitLabel: string;
  // Defaults to "取消" / "Cancel".
  cancelLabel?: string;
  canSubmit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  children?: ReactNode;
};

export function ScroDialogShell({
  open,
  isZh,
  title,
  description,
  submitLabel,
  cancelLabel,
  canSubmit,
  onCancel,
  onSubmit,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-[460px] max-w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{description}</p>

        {children ? <div className="mt-4 space-y-3">{children}</div> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {cancelLabel ?? (isZh ? "取消" : "Cancel")}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

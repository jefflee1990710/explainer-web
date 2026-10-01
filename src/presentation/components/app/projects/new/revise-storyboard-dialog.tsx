"use client";

import { useEffect, useId } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

// Confirm AI rewrite: full proposal, or clips only under the current brief.
export function ReviseStoryboardDialog({
  pending,
  title,
  body,
  confirmLabel,
  pendingLabel,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {title ?? t("brief.revise.defaultTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {body ?? t("brief.revise.defaultBody")}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? pendingLabel ?? t("brief.revise.pending") : confirmLabel ?? t("brief.revise.defaultConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

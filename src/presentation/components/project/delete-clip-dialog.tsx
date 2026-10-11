"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

// Confirms before a filmstrip clip, its frames, and its video are removed.
export function DeleteClipDialog({
  title,
  pending,
  error,
  blocked,
  onCancel,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  error: string;
  blocked?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (pending) return;
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/30 p-4"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="studio-app w-full max-w-md rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t("production.filmstrip.deleteTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--studio-muted)]">
          {blocked
            ? t("production.filmstrip.deleteLast")
            : t("production.filmstrip.deleteBody", { title })}
        </p>
        {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("production.action.cancel")}
          </StudioButton>
          <StudioButton variant="danger" onClick={onConfirm} disabled={pending || blocked}>
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? t("production.filmstrip.deletePending") : t("production.filmstrip.deleteConfirm")}
          </StudioButton>
        </div>
      </div>
    </DialogBackdrop>
  );
}

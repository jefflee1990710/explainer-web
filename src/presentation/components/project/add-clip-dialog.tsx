"use client";

import { useEffect, useId, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

// Asks for the new clip's content, then the director appends it.
export function AddClipDialog({
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (content: string) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [content, setContent] = useState("");
  const canConfirm = !pending && content.trim().length > 0;

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
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="studio-app w-full max-w-md rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (canConfirm) onConfirm(content.trim());
        }}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t("production.filmstrip.addTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">{t("production.filmstrip.addBody")}</p>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("production.filmstrip.addPlaceholder")}
          rows={5}
          autoFocus
          disabled={pending}
          className="mt-4 w-full resize-y rounded-lg border border-[var(--studio-line)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--studio-ink)]"
        />
        {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("production.action.cancel")}
          </StudioButton>
          <StudioButton type="submit" disabled={!canConfirm}>
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? t("production.filmstrip.addPending") : t("production.filmstrip.addConfirm")}
          </StudioButton>
        </div>
      </form>
    </DialogBackdrop>
  );
}

"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

// Confirms before a video-list row is removed.
export function VideoListDeleteDialog({
  title,
  pending,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  error: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const body =
    locale === "zh-Hant"
      ? `確定刪除「${title}」嗎？這會從清單移除。`
      : locale === "zh-Hans"
        ? `确定删除「${title}」吗？这会从清单移除。`
        : `Delete “${title}”? This removes it from your list.`;

  useEffect(() => {
    if (pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
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
        aria-busy={pending}
        className="studio-app w-full max-w-md rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t("video.delete.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--studio-muted)]">
          {body}
          {busy ? ` ${t("video.delete.pendingGenerationNote")}` : null}
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("common.cancel")}
          </StudioButton>
          <StudioButton variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <Spinner className="h-4 w-4" />
            ) : null}
            {pending
              ? locale === "zh-Hans"
                ? "删除中…"
                : locale === "en"
                  ? "Deleting…"
                  : "刪除中…"
              : t("video.delete.confirm")}
          </StudioButton>
        </div>
      </div>
    </DialogBackdrop>
  );
}

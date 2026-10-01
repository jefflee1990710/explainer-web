"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { deleteVideoAction } from "@/presentation/actions/projects";
import { isProjectBusy } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Confirm and delete a video plus stored frames, clips, and reel files.
export function DeleteVideoDialog({
  video,
  onClose,
  onDeleted,
}: {
  video: PublicVideo;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const title = video.phaseA?.localizedTitle || t("video.card.unnamed");
  const pending = isProjectBusy(video) || isReelBusy(video.reelStatus);

  useEffect(() => {
    if (deleting) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [deleting, onClose]);

  async function onConfirm() {
    setDeleting(true);
    setError("");
    const result = await deleteVideoAction(video.id);
    if (!result.ok) {
      setDeleting(false);
      setError(translateAppError(result.error, t));
      return;
    }
    onDeleted();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={deleting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="h-fit w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper px-6 pb-5 pt-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:px-7 sm:pb-5 sm:pt-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("video.delete.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("video.delete.body", { title })}
          {pending ? ` ${t("video.delete.pendingGenerationNote")}` : null}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-accent">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-red-700 bg-red-600 px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : null}
            {t("video.delete.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

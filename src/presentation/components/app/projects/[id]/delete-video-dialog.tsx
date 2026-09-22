"use client";

import { useId, useState } from "react";
import { deleteVideoAction } from "@/presentation/actions/projects";
import { isProjectBusy } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";

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
  const titleId = useId();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const title = video.phaseA?.localizedTitle || "未命名影片";
  const pending = isProjectBusy(video) || isReelBusy(video.reelStatus);

  async function onConfirm() {
    setDeleting(true);
    setError("");
    const result = await deleteVideoAction(video.id);
    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }
    onDeleted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-accent-ink/40 p-4 backdrop-blur-sm"
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
          刪除影片
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          確定要刪除「{title}」嗎？這會一併刪除分鏡、畫格、影片檔與相關儲存檔案，且無法復原。
          {pending ? " 目前仍在產生中，刪除後該次產生也會停止。" : null}
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
            取消
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : null}
            永久刪除
          </button>
        </div>
      </div>
    </div>
  );
}

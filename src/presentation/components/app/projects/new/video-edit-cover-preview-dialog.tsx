"use client";

import { useEffect, useId } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioButton } from "@/presentation/studio/studio-button";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import type { AspectRatio } from "@/model/project";

const FRAME_ASPECT: Record<AspectRatio, string> = {
  "16:9": "16 / 9",
  "9:16": "9 / 16",
  "1:1": "1 / 1",
};

// Full-size look at the saved cover. Backdrop and Escape close it.
export function VideoEditCoverPreviewDialog({
  src,
  aspectRatio,
  onClose,
}: {
  src: string;
  aspectRatio: AspectRatio;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const { saving, error, download } = useFileDownload();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(44rem,90vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--studio-line)] bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--studio-line)] px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {t("video.cover.current")}
          </h2>
          <StudioButton variant="ghost" onClick={onClose}>
            {t("common.close")}
          </StudioButton>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--studio-canvas)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={t("video.cover.current")}
            className="max-h-[min(70vh,36rem)] w-auto max-w-full object-contain"
            style={{ aspectRatio: FRAME_ASPECT[aspectRatio] }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-line)] px-4 py-3">
          {error ? (
            <p role="alert" className="mr-auto text-xs font-medium text-[#e11d48]">
              {error}
            </p>
          ) : null}
          <StudioButton variant="ghost" disabled={saving} onClick={() => void download(src, "cover.jpg")}>
            {t("video.cover.download")}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}

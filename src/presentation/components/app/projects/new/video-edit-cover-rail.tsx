"use client";

import { useState } from "react";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { VideoEditCoverPreviewDialog } from "@/presentation/components/app/projects/new/video-edit-cover-preview-dialog";
import { useDecodableImage, VideoEditEmptyThumb } from "@/presentation/components/app/projects/new/video-edit-thumb";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { AspectRatio } from "@/model/project";

// Cover still beside the player, with a download for the saved file.
export function VideoEditCoverRail({
  src,
  aspectRatio,
  busy = false,
}: {
  src?: string;
  aspectRatio: AspectRatio;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const { saving, error, download } = useFileDownload();
  const [open, setOpen] = useState(false);
  const picture = useDecodableImage(src);
  if (!src && !busy) return null;

  return (
    <aside className="flex w-28 shrink-0 flex-col items-stretch gap-2 sm:w-36">
      <div className={`relative overflow-hidden rounded-lg border border-[var(--studio-line)] bg-white ${ASPECT_CLASS[aspectRatio]}`}>
        {src && picture === "ok" ? (
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label={t("video.cover.openPreview")}
            onClick={() => setOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={src} src={src} alt="" className="h-full w-full object-contain" />
          </button>
        ) : picture === "bad" && !busy ? (
          <VideoEditEmptyThumb />
        ) : null}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-semibold text-white">…</span>
        ) : null}
      </div>
      {src && picture === "ok" ? (
        <StudioButton variant="ghost" disabled={saving} onClick={() => void download(src, "cover.jpg")}>
          {t("video.cover.download")}
        </StudioButton>
      ) : null}
      {error ? (
        <p role="alert" className="text-center text-[11px] font-medium text-[#e11d48]">
          {error}
        </p>
      ) : null}
      {open && src ? (
        <VideoEditCoverPreviewDialog src={src} aspectRatio={aspectRatio} onClose={() => setOpen(false)} />
      ) : null}
    </aside>
  );
}

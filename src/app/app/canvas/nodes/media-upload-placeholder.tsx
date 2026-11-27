"use client";

// Placeholder card for an image or video that is still uploading, or that failed and can be dismissed.

import { useEffect } from "react";
import { AlertCircle, Film, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import type { CanvasMediaUploadState } from "@/model/canvas";
import { forgetUploadPreview, peekUploadPreviewUrl } from "@/app/app/canvas/workspace/canvas-media-drop";
import { PORT_COLOR_MAP, useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

// Cards currently on screen. A strict-mode remount stays in this set, so the file is kept.
const liveUploadCards = new Set<string>();

export function MediaUploadPlaceholder({
  id,
  selected,
  fileName,
  mediaKind,
  upload,
}: {
  id: string;
  selected?: boolean;
  fileName: string;
  mediaKind: "image" | "video";
  upload: CanvasMediaUploadState;
}) {
  const { locale, onDeleteNode } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const failed = upload.phase === "failed";
  const color = PORT_COLOR_MAP[mediaKind];
  const progress = upload.progress;
  const hasProgress = typeof progress === "number";
  const previewUrl = peekUploadPreviewUrl(id);

  // Revoke the local preview only after the card is really gone (strict mode remounts first).
  useEffect(() => {
    liveUploadCards.add(id);
    return () => {
      liveUploadCards.delete(id);
      queueMicrotask(() => {
        if (!liveUploadCards.has(id)) forgetUploadPreview(id);
      });
    };
  }, [id]);
  const uploadingLabel = hasProgress
    ? isZh
      ? `上傳中 ${progress}%`
      : `Uploading ${progress}%`
    : isZh
      ? "上傳中…"
      : "Uploading…";

  return (
    <div
      className={`group relative w-[240px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected
          ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25"
          : failed
            ? "border-rose-400/55"
            : "border-[#c6f24b]/40"
      }`}
      role="status"
      aria-live="polite"
      aria-busy={!failed}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {mediaKind === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
          </span>
          <span className="truncate text-[11.5px] font-semibold text-white/90">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title={failed ? (isZh ? "關閉" : "Dismiss") : isZh ? "移除" : "Remove"}
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2.5">
        <div className="relative overflow-hidden rounded-[10px] bg-black/40">
          {previewUrl ? (
            mediaKind === "video" ? (
              <video
                src={previewUrl}
                muted
                playsInline
                className="pointer-events-none max-h-[168px] w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={fileName} className="max-h-[180px] w-full object-contain" />
            )
          ) : (
            <div className="grid h-24 place-items-center text-white/30">
              {mediaKind === "video" ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
            </div>
          )}

          {failed ? null : (
            <div className="absolute inset-0 grid place-items-center bg-[#0b0e13]/60 px-3">
              <div className="w-full max-w-[200px]">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={hasProgress ? progress : undefined}
                  aria-valuetext={uploadingLabel}
                >
                  {hasProgress ? (
                    <div
                      className="h-full rounded-full bg-[#c6f24b] transition-[width] duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  ) : (
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-[#c6f24b]" />
                  )}
                </div>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c6f24b]" />
                  {uploadingLabel}
                </p>
              </div>
            </div>
          )}
        </div>

        {failed ? (
          <div className="mt-2">
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{upload.error || (isZh ? "上傳失敗" : "Upload failed")}</span>
            </p>
            <button
              type="button"
              onClick={() => onDeleteNode(id)}
              className="nodrag mt-2 w-full cursor-pointer rounded-[10px] border border-white/10 bg-white/6 px-3 py-1.5 text-[12px] font-semibold text-white/85 transition hover:bg-white/10"
            >
              {isZh ? "關閉" : "Dismiss"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

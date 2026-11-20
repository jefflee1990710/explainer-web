"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function VideoPreviewModal({
  open,
  title,
  videoUrl,
  imageUrl,
  gifUrl,
  clipUrls = [],
  subtitle,
  onClose,
}: {
  open: boolean;
  title: string;
  videoUrl?: string;
  imageUrl?: string;
  gifUrl?: string;
  clipUrls?: string[];
  subtitle?: string;
  onClose: () => void;
}) {
  const defaultUrl = videoUrl || clipUrls[0];
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(undefined);
  const activeUrl =
    selectedUrl && (selectedUrl === videoUrl || clipUrls.includes(selectedUrl))
      ? selectedUrl
      : defaultUrl;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const downloadableUrl = activeUrl || imageUrl || gifUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#12141c] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-sm font-bold text-white">{title}</h2>
            {subtitle ? <p className="truncate text-xs text-white/55">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {downloadableUrl ? (
              <a
                href={downloadableUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#12141c] transition hover:brightness-105"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-black/60 p-4">
          {activeUrl ? (
            <video
              key={activeUrl}
              src={activeUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[68vh] w-full rounded-xl bg-black object-contain"
            />
          ) : imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[68vh] rounded-xl object-contain"
            />
          ) : (
            <div className="py-16 text-center text-sm text-white/55">
              影片仍在生成或暫無可預覽檔案
            </div>
          )}

          {clipUrls.length > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {videoUrl ? (
                <button
                  type="button"
                  onClick={() => setSelectedUrl(videoUrl)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeUrl === videoUrl
                      ? "bg-[#c6f24b] text-[#12141c]"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  Full Reel
                </button>
              ) : null}
              {clipUrls.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedUrl(url)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeUrl === url
                      ? "bg-[#c6f24b] text-[#12141c]"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  Clip {idx + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

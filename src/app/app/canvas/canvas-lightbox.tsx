"use client";

// Full-screen lightbox modal for inspecting and downloading canvas node images/videos.

import { useEffect } from "react";
import { Download, X } from "lucide-react";
import type { CanvasLightboxItem } from "@/app/app/canvas/nodes/port-colors";

export function CanvasLightbox({
  item,
  onClose,
}: {
  item: CanvasLightboxItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#10141c] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
          <span className="truncate text-sm font-semibold text-white">
            {item.title ||
              (item.kind === "video"
                ? "Video Preview"
                : item.kind === "audio"
                  ? "Audio Preview"
                  : "Image Preview")}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={item.url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/15"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-black/60 p-3">
          {item.kind === "video" ? (
            <video
              src={item.url}
              controls
              autoPlay
              className="max-h-[78vh] max-w-[85vw] rounded-lg"
            />
          ) : item.kind === "audio" ? (
            <div className="w-[420px] max-w-[85vw] rounded-xl border border-amber-400/25 bg-[#141821] p-6">
              <audio src={item.url} controls autoPlay className="w-full" />
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.url}
              alt={item.title || "Preview"}
              className="max-h-[78vh] max-w-[85vw] rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

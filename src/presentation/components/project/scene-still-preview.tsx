"use client";

import { useEffect, useState } from "react";
import { FrameTileDrawing } from "@/presentation/components/project/frame-tile-drawing";
import { previewSrcWhileBusy } from "@/presentation/components/project/scene-still-preview-src";
import { displayMediaSrc } from "@/util/media-src";
import type { AspectRatio, ClipFrame } from "@/model/project";

// Start or end still shown next to the director chat.
export function SceneStillPreview({
  frame,
  aspectRatio,
  label,
  regenerating = false,
}: {
  frame?: ClipFrame;
  aspectRatio: AspectRatio;
  label: string;
  regenerating?: boolean;
}) {
  const liveSrc = displayMediaSrc(frame);
  const [heldSrc, setHeldSrc] = useState(liveSrc);
  const busy =
    regenerating || frame?.status === "queued" || frame?.status === "in_progress";
  const src = previewSrcWhileBusy(liveSrc, heldSrc, busy);

  useEffect(() => {
    if (liveSrc) setHeldSrc(liveSrc);
  }, [liveSrc]);

  return (
    <figure className="min-w-0">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-accent-ink/10 bg-paper"
        style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
      >
        {src ? (
          <img src={src} alt={label} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="grid h-full min-h-24 w-full place-items-center p-3 text-center text-[11px] font-semibold text-muted">
            {label}
          </div>
        )}
        {busy ? (
          <>
            {src ? <div className="absolute inset-0 bg-paper/55" aria-hidden /> : null}
            <FrameTileDrawing />
          </>
        ) : null}
      </div>
      <figcaption className="mt-1.5 text-[11px] text-muted">{label}</figcaption>
    </figure>
  );
}

"use client";

import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import type { AspectRatio } from "@/model/project";

// Right-hand cover preview: the whole still stays visible and sits in the middle.
export function VideoEditCoverPreview({
  src,
  aspectRatio,
  emptyLabel,
  label,
}: {
  src?: string;
  aspectRatio: AspectRatio;
  emptyLabel: string;
  label: string;
}) {
  return (
    <div className="flex h-full min-h-72 items-center justify-center border-t border-[var(--studio-line)] bg-[var(--studio-canvas)] p-6 lg:border-l lg:border-t-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="max-h-[min(70vh,36rem)] max-w-full object-contain" />
      ) : (
        <p
          className={`grid w-full max-w-[16rem] place-items-center border border-dashed border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 text-center text-xs text-[var(--studio-muted)] ${ASPECT_CLASS[aspectRatio]}`}
        >
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

"use client";

import type { AspectRatio } from "@/model/project";

// Keyed subtitle plate over the clip video. Same ratios as subtitlePlacement, with no fade.
// z-20 sits above the play control; pointer-events-none keeps that control clickable.
export function ClipSubtitleOverlay({
  src,
  aspectRatio,
}: {
  src: string;
  aspectRatio: AspectRatio;
}) {
  const wide = aspectRatio === "16:9";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="pointer-events-none absolute z-20 h-auto"
      style={
        wide
          ? { width: "78%", left: "50%", bottom: "8%", transform: "translateX(-50%)" }
          : { width: "78%", left: "50%", top: "62%", transform: "translate(-50%, -50%)" }
      }
    />
  );
}

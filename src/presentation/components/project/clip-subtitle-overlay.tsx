"use client";

import type { CSSProperties } from "react";
import type { AspectRatio } from "@/model/project";
import { PREVIEW_VIDEO_FLEX } from "@/presentation/components/project/clip-preview-fit";

// Keyed subtitle plate over the clip video. Same ratios as subtitlePlacement, with no fade.
// z-20 sits above the play control; pointer-events-none keeps that control clickable.
export function ClipSubtitleOverlay({
  src,
  aspectRatio,
}: {
  src: string;
  aspectRatio: AspectRatio;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="pointer-events-none absolute z-20 h-auto"
      style={plateStyle(aspectRatio)}
    />
  );
}

// 16:9 and 9:16 boxes match the frame. The 1:1 box is 2.5:1 with side bars,
// so 78% is of the visible square, centered, with its middle at 62% of the frame height.
function plateStyle(aspectRatio: AspectRatio): CSSProperties {
  if (aspectRatio === "16:9") {
    return { width: "78%", left: "50%", bottom: "8%", transform: "translateX(-50%)" };
  }
  if (aspectRatio === "1:1") {
    return {
      width: `calc(78% / ${PREVIEW_VIDEO_FLEX})`,
      left: "50%",
      top: "62%",
      transform: "translate(-50%, -50%)",
    };
  }
  return { width: "78%", left: "50%", top: "62%", transform: "translate(-50%, -50%)" };
}

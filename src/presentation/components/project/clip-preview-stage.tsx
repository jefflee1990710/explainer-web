"use client";

import { useEffect, useRef, useState } from "react";
import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import { previewStageFit } from "@/presentation/components/project/clip-preview-fit";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import { isFrameTilePending } from "@/presentation/components/project/frame-tile-face";
import type { ClipState } from "@/service/clip-stage";
import type { AspectRatio, ClipFrame, FramePosition, ProjectClip } from "@/model/project";

const GAP = 16;
const CAPTION = 28;

// Preview row: start still | clip video | end still. Sizes to the pane so
// 9:16 never overflows — width shrinks when height is the tighter limit.
export function ClipPreviewStage({
  start,
  end,
  clip,
  state,
  aspectRatio,
  framesPending,
  startPending,
  endPending,
  videoPending,
  onOpenFrame,
  onGenerateVideo,
}: {
  start?: ClipFrame;
  end?: ClipFrame;
  clip?: ProjectClip;
  state: ClipState;
  aspectRatio: AspectRatio;
  framesPending: boolean;
  startPending: boolean;
  endPending: boolean;
  videoPending: boolean;
  onOpenFrame: (position: FramePosition) => void;
  onGenerateVideo: () => void;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPane({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fit = previewStageFit({
    aspectRatio,
    containerWidth: pane.w,
    containerHeight: pane.h,
    gap: GAP,
    caption: CAPTION,
  });
  const ready = pane.w > 0 && pane.h > 0 && fit.start.width > 0;

  return (
    <div
      ref={paneRef}
      className="flex h-full min-h-[24rem] w-full items-center justify-center overflow-hidden p-4 lg:min-h-0"
    >
      {ready ? (
        <div className="flex items-start" style={{ gap: GAP }}>
          <FrameTile
            frame={start}
            position="start"
            aspectRatio={aspectRatio}
            pending={isFrameTilePending(start, startPending || framesPending)}
            stale={state.stale.frames}
            boxStyle={fit.start}
            onOpen={() => onOpenFrame("start")}
          />
          <ClipVideoPanel
            clip={clip}
            state={state}
            aspectRatio={aspectRatio}
            pending={videoPending}
            boxStyle={fit.video}
            onGenerate={onGenerateVideo}
          />
          <FrameTile
            frame={end}
            position="end"
            aspectRatio={aspectRatio}
            pending={isFrameTilePending(end, endPending || framesPending)}
            stale={state.stale.frames}
            boxStyle={fit.end}
            onOpen={() => onOpenFrame("end")}
          />
        </div>
      ) : null}
    </div>
  );
}

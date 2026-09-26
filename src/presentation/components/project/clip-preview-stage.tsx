"use client";

import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import type { ClipState } from "@/service/clip-stage";
import type { AspectRatio, ClipFrame, FramePosition, ProjectClip } from "@/model/project";

// Preview row: start still | clip video | end still. Sizes stay the same
// whether the clip already has a playable video.
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
  return (
    <div className="flex items-center justify-center gap-4 p-4">
      <div className="w-36 shrink-0 sm:w-44">
        <FrameTile
          frame={start}
          position="start"
          aspectRatio={aspectRatio}
          pending={startPending || framesPending}
          stale={state.stale.frames}
          onOpen={() => onOpenFrame("start")}
        />
      </div>
      <div className="min-w-0 flex-1 max-w-md">
        <ClipVideoPanel
          clip={clip}
          state={state}
          aspectRatio={aspectRatio}
          pending={videoPending}
          onGenerate={onGenerateVideo}
          part="player"
        />
      </div>
      <div className="w-36 shrink-0 sm:w-44">
        <FrameTile
          frame={end}
          position="end"
          aspectRatio={aspectRatio}
          pending={endPending || framesPending}
          stale={state.stale.frames}
          onOpen={() => onOpenFrame("end")}
        />
      </div>
    </div>
  );
}

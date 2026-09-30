"use client";

import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import type { ClipState } from "@/service/clip-stage";
import type { AspectRatio, ClipFrame, FramePosition, ProjectClip } from "@/model/project";

// Preview row: start still | clip video | end still. Grows with the pane
// (1 : 2.5 : 1) so wide layouts use horizontal space instead of centering.
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
    <div className="flex w-full min-w-0 items-start gap-4 p-4">
      <div className="min-w-0 flex-1 basis-36 sm:basis-44">
        <FrameTile
          frame={start}
          position="start"
          aspectRatio={aspectRatio}
          pending={startPending || framesPending || state.stage === "frames_generating"}
          stale={state.stale.frames}
          onOpen={() => onOpenFrame("start")}
        />
      </div>
      <div className="min-w-0 flex-[2.5]">
        <ClipVideoPanel
          clip={clip}
          state={state}
          aspectRatio={aspectRatio}
          pending={videoPending}
          onGenerate={onGenerateVideo}
        />
      </div>
      <div className="min-w-0 flex-1 basis-36 sm:basis-44">
        <FrameTile
          frame={end}
          position="end"
          aspectRatio={aspectRatio}
          pending={endPending || framesPending || state.stage === "frames_generating"}
          stale={state.stale.frames}
          onOpen={() => onOpenFrame("end")}
        />
      </div>
    </div>
  );
}

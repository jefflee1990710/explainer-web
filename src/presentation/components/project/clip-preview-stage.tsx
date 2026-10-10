"use client";

import { useEffect, useRef, useState } from "react";
import { FramePromptChatButton } from "@/presentation/components/project/frame-prompt-chat-button";
import { ClipPreviewBrowse } from "@/presentation/components/project/clip-preview-browse";
import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import { previewStageFit } from "@/presentation/components/project/clip-preview-fit";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import { isFrameTilePending } from "@/presentation/components/project/frame-tile-face";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { ClipState } from "@/service/clip-stage";
import { displayMediaSrc } from "@/util/media-src";
import type { AspectRatio, ClipFrame, FramePosition, ProjectClip } from "@/model/project";

const GAP = 16;
// Status line under the still, plus the prompt-chat button.
const CAPTION = 76;

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
  cancelPending,
  onOpenFrame,
  onGenerateVideo,
  onCancelVideo,
  prevClip,
  nextClip,
  onSelect,
  editingPosition,
  onEditPrompt,
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
  cancelPending: boolean;
  onOpenFrame: (position: FramePosition) => void;
  onGenerateVideo: () => void;
  onCancelVideo: () => void;
  prevClip?: number;
  nextClip?: number;
  onSelect: (clipNumber: number) => void;
  editingPosition?: FramePosition;
  onEditPrompt: (position: FramePosition) => void;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const { t } = useI18n();
  const editLabel = t("production.frameChat.open");

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
  const startDrawing = isFrameTilePending(start, startPending || framesPending);
  // Keep the scene still in the video slot until the clip file replaces it.
  const videoPoster = startDrawing ? undefined : displayMediaSrc(start) ?? displayMediaSrc(end);

  return (
    <div
      ref={paneRef}
      className="relative flex h-full min-h-[24rem] w-full items-center justify-center overflow-hidden px-16 py-4 lg:min-h-0"
    >
      {prevClip !== undefined || nextClip !== undefined ? (
        <>
          <ClipPreviewBrowse direction="prev" clipNumber={prevClip} onSelect={onSelect} />
          <ClipPreviewBrowse direction="next" clipNumber={nextClip} onSelect={onSelect} />
        </>
      ) : null}
      {ready ? (
        <div className="flex items-center" style={{ gap: GAP }}>
          <div className="flex flex-col" style={{ width: fit.start.width }}>
            <FrameTile
              frame={start}
              position="start"
              aspectRatio={aspectRatio}
              pending={isFrameTilePending(start, startPending || framesPending)}
              stale={state.stale.frames}
              boxStyle={fit.start}
              onOpen={() => onOpenFrame("start")}
            />
            <FramePromptChatButton
              label={editLabel}
              active={editingPosition === "start"}
              onClick={() => onEditPrompt("start")}
            />
          </div>
          <ClipVideoPanel
            clip={clip}
            state={state}
            aspectRatio={aspectRatio}
            pending={videoPending}
            posterSrc={videoPoster}
            boxStyle={fit.video}
            onGenerate={onGenerateVideo}
            onCancel={onCancelVideo}
            cancelPending={cancelPending}
          />
          <div className="flex flex-col" style={{ width: fit.end.width }}>
            <FrameTile
              frame={end}
              position="end"
              aspectRatio={aspectRatio}
              pending={isFrameTilePending(end, endPending || framesPending)}
              stale={state.stale.frames}
              boxStyle={fit.end}
              onOpen={() => onOpenFrame("end")}
            />
            <FramePromptChatButton
              label={editLabel}
              active={editingPosition === "end"}
              onClick={() => onEditPrompt("end")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

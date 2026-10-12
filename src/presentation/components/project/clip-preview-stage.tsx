"use client";

import { useEffect, useRef, useState } from "react";
import { ClipPlateRetry } from "@/presentation/components/project/clip-plate-retry";
import { ClipPreviewBrowse } from "@/presentation/components/project/clip-preview-browse";
import { ClipVideoPanel } from "@/presentation/components/project/clip-video-panel";
import { previewStageFit } from "@/presentation/components/project/clip-preview-fit";
import { FrameTile } from "@/presentation/components/project/frame-tile";
import { isFrameTilePending } from "@/presentation/components/project/frame-tile-face";
import { SceneChatButton } from "@/presentation/components/project/scene-chat-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";
import type { ClipState } from "@/service/clip-stage";
import { displayMediaSrc } from "@/util/media-src";
import type { AspectRatio, ClipFrame, FramePosition, ProjectClip, SubtitlePlate } from "@/model/project";

const GAP = 16;
// Status line under the still.
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
  cancelPending,
  onOpenFrame,
  onGenerateVideo,
  onCancelVideo,
  prevClip,
  nextClip,
  onSelect,
  sceneChatOpen,
  onEditScene,
  endStill = true,
  subtitleOverlay,
  subtitlePlates,
  videoId,
  onProject,
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
  sceneChatOpen?: boolean;
  onEditScene: () => void;
  // False hides the end still. The end scene text still lives in the storyboard.
  endStill?: boolean;
  // Talking-head plates. Only a completed plate is drawn on the clip video.
  subtitleOverlay: boolean;
  subtitlePlates?: SubtitlePlate[];
  videoId: string;
  onProject?: (project: PublicVideo) => void;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const { t } = useI18n();

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
    endStill,
  });
  const ready = pane.w > 0 && pane.h > 0 && fit.start.width > 0;
  const startDrawing = isFrameTilePending(start, startPending || framesPending);
  // Keep the scene still in the video slot until the clip file replaces it.
  const videoPoster = startDrawing ? undefined : displayMediaSrc(start) ?? displayMediaSrc(end);
  const plate = subtitlePlates?.find((item) => item.clipNumber === state.clipNumber);
  // Start and end stills stay clean; the plate only covers the playing clip.
  const subtitleSrc =
    subtitleOverlay && plate?.status === "completed" ? plate.blobUrl : undefined;
  // A missing or failed plate can be redone; before any frames exist, generate-all adds it.
  const plateNeedsRetry =
    subtitleOverlay &&
    state.stage !== "no_frames" &&
    (!plate || plate.status === "failed");

  return (
    <div
      ref={paneRef}
      className="relative flex h-full min-h-[24rem] w-full items-center justify-center overflow-hidden px-16 py-4 lg:min-h-0"
    >
      <SceneChatButton
        label={t("production.sceneChat.open")}
        active={Boolean(sceneChatOpen)}
        onClick={onEditScene}
      />
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
          </div>
          <ClipVideoPanel
            clip={clip}
            state={state}
            aspectRatio={aspectRatio}
            pending={videoPending}
            posterSrc={videoPoster}
            subtitleSrc={subtitleSrc}
            plateRetry={
              plateNeedsRetry ? (
                <ClipPlateRetry
                  videoId={videoId}
                  clipNumber={state.clipNumber}
                  plateError={plate?.error}
                  onProject={onProject}
                />
              ) : null
            }
            boxStyle={fit.video}
            onGenerate={onGenerateVideo}
            onCancel={onCancelVideo}
            cancelPending={cancelPending}
          />
          {endStill ? (
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
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

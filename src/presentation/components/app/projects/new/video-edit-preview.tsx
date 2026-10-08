"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { useElementSize } from "@/presentation/components/app/projects/new/use-element-size";
import { VideoEditCoverRail } from "@/presentation/components/app/projects/new/video-edit-cover-rail";
import { VideoEditTimeline, type EditSlot } from "@/presentation/components/app/projects/new/video-edit-timeline";
import {
  layerPlacement,
  placementFromDrag,
  placementStyle,
  widthPctFromBox,
} from "@/service/video-edit/layer-placement";
import {
  buildEditTimeline,
  defaultTimelineId,
  isTimelineBookend,
  nextPlayableTimelineId,
  type EditTimelineItem,
} from "@/service/video-edit/edit-timeline";
import type { AspectRatio } from "@/model/project";
import type { BrandLayer, EditTransition, VideoEdit } from "@/model/video-edit";

export type EditSelection = "" | "intro" | "outro" | string;

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; left: number; top: number; w: number; h: number };

export function VideoEditPreview({
  clips,
  posters,
  aspectRatio,
  edit,
  selected,
  onSelect,
  onLayerChange,
  onTransitionChange,
  coverUrl,
  coverBusy,
  onOpenSlot,
}: {
  clips: Array<{ clipNumber: number; blobUrl?: string; outputUrl?: string }>;
  posters?: Array<{ clipNumber: number; src?: string }>;
  aspectRatio: AspectRatio;
  edit: VideoEdit;
  selected: EditSelection;
  onSelect: (id: EditSelection) => void;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
  onTransitionChange: (fromId: string, toId: string, transition: EditTransition) => void;
  coverUrl?: string;
  coverBusy?: boolean;
  onOpenSlot: (slot: EditSlot) => void;
}) {
  const { t } = useI18n();
  const items = buildEditTimeline({ intro: edit.intro, outro: edit.outro, clips, posters });
  const [previewId, setPreviewId] = useState(() => defaultTimelineId(items));
  const [advancing, setAdvancing] = useState(false);
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<{ left: number; top: number; w: number } | null>(null);
  const boxes = useRef(new Map<string, HTMLImageElement>());
  const videoRef = useRef<HTMLVideoElement>(null);
  // Ignore the ended event the previous clip emits while its src is replaced.
  const switchedAt = useRef(0);
  const current = items.find((item) => item.id === previewId) ?? items.find((item) => item.id === defaultTimelineId(items));
  const showingBookend = current && isTimelineBookend(current.id) ? current : undefined;

  useEffect(() => {
    if (items.some((item) => item.id === previewId)) return;
    setPreviewId(defaultTimelineId(items));
  }, [items, previewId]);

  useEffect(() => {
    if (selected === "intro" || selected === "outro") setPreviewId(selected);
  }, [selected]);

  function playFrom(id: string) {
    const item = items.find((row) => row.id === id);
    switchedAt.current = performance.now();
    onSelect(id);
    setPreviewId(id);
    setAdvancing(Boolean(item?.src));
    if (item?.mediaKind === "video") {
      requestAnimationFrame(() => void videoRef.current?.play());
    }
  }

  function openSlot(slot: EditSlot) {
    if (slot === "intro" || slot === "outro") {
      onSelect(slot);
      setPreviewId(slot);
      setAdvancing(false);
    }
    onOpenSlot(slot);
  }

  function advance(event?: React.SyntheticEvent<HTMLVideoElement>) {
    if (performance.now() - switchedAt.current < 500) return;
    const video = event?.currentTarget;
    // Swapping the clip src can emit ended at time 0. That is not the clip finishing.
    if (
      video &&
      Number.isFinite(video.duration) &&
      video.duration > 0.25 &&
      video.currentTime < video.duration - 0.25
    ) {
      return;
    }
    const nextId = nextPlayableTimelineId(items, previewId);
    if (!nextId) {
      setAdvancing(false);
      return;
    }
    onSelect(nextId);
    setPreviewId(nextId);
  }

  useEffect(() => {
    if (!advancing || current?.mediaKind !== "video") return;
    void videoRef.current?.play();
  }, [advancing, current?.id, current?.src, current?.mediaKind]);

  useEffect(() => {
    if (!advancing || current?.mediaKind !== "image" || !current.src) return;
    const timer = window.setTimeout(advance, (current.durationSec ?? 2) * 1000);
    return () => window.clearTimeout(timer);
    // advance closes over the latest previewId via current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancing, current?.id, current?.mediaKind, current?.src, current?.durationSec]);

  function startDrag(event: React.PointerEvent, layer: BrandLayer, mode: Drag["mode"]) {
    const img = boxes.current.get(layer.id);
    const host = frameRef.current;
    if (!img || !host) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    const a = img.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    onSelect(layer.id);
    setDrag({ id: layer.id, mode, startX: event.clientX, startY: event.clientY, left: a.left - b.left, top: a.top - b.top, w: a.width, h: a.height });
    setLive({ left: a.left - b.left, top: a.top - b.top, w: a.width });
  }

  function moveDrag(event: React.PointerEvent) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setLive(
      drag.mode === "move"
        ? { left: drag.left + dx, top: drag.top + dy, w: drag.w }
        : { left: drag.left, top: drag.top, w: Math.max(8, drag.w + dx) },
    );
  }

  function endDrag() {
    if (!drag || !live) return;
    if (live.left === drag.left && live.top === drag.top && live.w === drag.w) {
      setDrag(null);
      setLive(null);
      return;
    }
    const boxH = (drag.h / drag.w) * live.w;
    const patch =
      drag.mode === "move"
        ? placementFromDrag({ left: live.left, top: live.top, boxW: live.w, boxH, frameW: frame.width, frameH: frame.height })
        : { widthPct: widthPctFromBox(live.w, frame.width) };
    onLayerChange(drag.id, patch);
    setDrag(null);
    setLive(null);
  }

  const frameClass = [
    "relative w-auto overflow-hidden rounded-lg bg-black",
    ASPECT_CLASS[aspectRatio],
    // Phone height leaves room for the header, specs, and filmstrip. Desktop fills the stage.
    "h-[min(36rem,calc(100dvh-19rem))] lg:h-full lg:max-h-full",
    aspectRatio === "9:16" ? "max-w-[min(100%,22rem)]" : "max-w-[min(100%,48rem)]",
  ].join(" ");

  return (
    <div className="flex w-full flex-col lg:h-full lg:min-h-0 lg:flex-1">
      <div className="flex w-full items-center justify-center gap-3 px-3 pt-3 lg:min-h-0 lg:flex-1">
      <VideoEditCoverRail src={coverUrl} aspectRatio={aspectRatio} busy={coverBusy} />
      <div
        ref={frameRef}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onClick={() => onSelect(previewId)}
        className={frameClass}
      >
        <TimelineMedia
          item={current}
          videoRef={videoRef}
          emptyLabel={t(current?.kind === "clip" ? "video.preview.clipPending" : "video.preview.slotEmpty")}
          onPlay={() => setAdvancing(true)}
          onEnded={advance}
        />
        {showingBookend || !frame.width
          ? null
          : edit.layers.map((layer) => {
              const dragging = drag?.id === layer.id ? live : null;
              const style = dragging
                ? { width: dragging.w, left: dragging.left, top: dragging.top }
                : placementStyle(layerPlacement(layer, frame.width, frame.height));
              const active = selected === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`absolute touch-none ${active ? "outline outline-2 outline-[var(--studio-teal)]" : ""}`}
                  style={{ ...style, opacity: layer.opacity }}
                  onPointerDown={(event) => startDrag(event, layer, "move")}
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={(node) => {
                      if (node) boxes.current.set(layer.id, node);
                      else boxes.current.delete(layer.id);
                    }}
                    src={layer.assetUrl}
                    alt=""
                    draggable={false}
                    className="block h-auto w-full cursor-move select-none"
                  />
                  {active ? (
                    <span
                      aria-label={t("video.preview.resizeAria")}
                      onPointerDown={(event) => startDrag(event, layer, "resize")}
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[var(--studio-teal)]"
                    />
                  ) : null}
                </div>
              );
            })}
      </div>
      </div>
      <VideoEditTimeline
        items={items}
        edit={edit}
        activeId={previewId}
        coverUrl={coverUrl}
        coverBusy={coverBusy}
        aspectRatio={aspectRatio}
        onPlayFrom={playFrom}
        onTransitionChange={onTransitionChange}
        onOpenSlot={openSlot}
      />
    </div>
  );
}

function TimelineMedia({
  item,
  videoRef,
  emptyLabel,
  onPlay,
  onEnded,
}: {
  item?: EditTimelineItem;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  emptyLabel: string;
  onPlay: () => void;
  onEnded: () => void;
}) {
  if (item?.mediaKind === "video" && item.src) {
    return (
      <video
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        controls
        playsInline
        onPlay={onPlay}
        onEnded={onEnded}
        className="absolute inset-0 h-full w-full object-contain"
      />
    );
  }
  if (item?.mediaKind === "image" && item.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  if (item?.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.poster} alt="" className="absolute inset-0 h-full w-full object-contain" />
    );
  }
  return <p className="absolute inset-0 grid place-items-center text-sm text-white/70">{emptyLabel}</p>;
}

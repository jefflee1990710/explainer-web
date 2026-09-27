"use client";

import { useRef, useState } from "react";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { useElementSize } from "@/presentation/components/app/projects/new/use-element-size";
import {
  layerPlacement,
  placementFromDrag,
  placementStyle,
  widthPctFromBox,
} from "@/service/video-edit/layer-placement";
import type { AspectRatio } from "@/model/project";
import type { BookendClip, BrandLayer, VideoEdit } from "@/model/video-edit";

export type EditSelection = "" | "intro" | "outro" | string;

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; left: number; top: number; w: number; h: number };

// Reel player with brand layers drawn on top. The selected layer drags to a
// corner and resizes from its bottom-right handle; values save as percentages.
export function VideoEditPreview({
  reelUrl,
  aspectRatio,
  edit,
  selected,
  onSelect,
  onLayerChange,
}: {
  reelUrl?: string;
  aspectRatio: AspectRatio;
  edit: VideoEdit;
  selected: EditSelection;
  onSelect: (id: EditSelection) => void;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
}) {
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<{ left: number; top: number; w: number } | null>(null);
  const boxes = useRef(new Map<string, HTMLImageElement>());
  const showing = selected === "intro" || selected === "outro" ? edit[selected] : undefined;

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
    // A click without movement must not rewrite placement (rounding / centre margin).
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

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div
        ref={frameRef}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onClick={() => onSelect("")}
        className={`relative w-full overflow-hidden rounded-lg bg-black ${aspectRatio === "9:16" ? "max-w-[22rem]" : "max-w-3xl"} ${ASPECT_CLASS[aspectRatio]}`}
      >
        {showing ? (
          <BookendMedia clip={showing} />
        ) : reelUrl ? (
          <video key={reelUrl} src={reelUrl} controls className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/70">成片合成中…</p>
        )}
        {showing || !frame.width
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
                      aria-label="調整大小"
                      onPointerDown={(event) => startDrag(event, layer, "resize")}
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[var(--studio-teal)]"
                    />
                  ) : null}
                </div>
              );
            })}
      </div>
      <div className="flex gap-3">
        <BookendCard label="開頭" clip={edit.intro} active={selected === "intro"} onClick={() => onSelect(selected === "intro" ? "" : "intro")} />
        <BookendCard label="正片" active={!showing} onClick={() => onSelect("")} />
        <BookendCard label="結尾" clip={edit.outro} active={selected === "outro"} onClick={() => onSelect(selected === "outro" ? "" : "outro")} />
      </div>
    </div>
  );
}

function BookendMedia({ clip }: { clip: BookendClip }) {
  return clip.kind === "video" ? (
    <video key={clip.assetUrl} src={clip.assetUrl} controls autoPlay className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={clip.assetUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
  );
}

function BookendCard({ label, clip, active, onClick }: { label: string; clip?: BookendClip; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-20 flex-col overflow-hidden rounded-md border text-left text-[11px] font-semibold ${active ? "border-2 border-[var(--studio-teal)]" : "border-[var(--studio-line)]"}`}
    >
      <span className="relative block aspect-video bg-[var(--studio-fill)]">
        {clip?.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.assetUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : clip?.kind === "video" ? (
          <video src={clip.assetUrl} muted className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="bg-white px-1.5 py-1">{label}</span>
    </button>
  );
}

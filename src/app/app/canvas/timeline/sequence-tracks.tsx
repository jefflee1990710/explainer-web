"use client";

// Track lanes of the Sequence timeline: ruler, clips (drag to reorder, edges to trim),
// layers and audio items (drag to move, edges to resize), and the playhead.

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Film, ImageIcon, Music, Type } from "lucide-react";
import type { CanvasSequence } from "@/model/canvas-sequence";
import { audioItemSec, type PlacedClip } from "@/service/canvas/core/sequence";
import { BeatMarkers } from "@/app/app/canvas/timeline/beat-markers";
import {
  patchAudio,
  patchClip,
  patchLayer,
  reorderClips,
  resizeLayer,
  shiftWindow,
  trimClip,
  type SequenceSelection,
} from "@/app/app/canvas/timeline/sequence-timeline-model";
import type { SequenceSource } from "@/app/app/canvas/timeline/use-sequence-sources";

const LABEL_W = 76;
const ROW = 26;

// Pointer drag reporting the horizontal move in timeline seconds.
function startDrag(
  event: ReactPointerEvent,
  pps: number,
  onMove: (deltaSec: number) => void,
  onEnd?: (deltaSec: number) => void,
) {
  event.stopPropagation();
  event.preventDefault();
  const startX = event.clientX;
  const move = (e: PointerEvent) => onMove((e.clientX - startX) / pps);
  const up = (e: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    onEnd?.((e.clientX - startX) / pps);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function Handle({ side, onPointerDown }: { side: "left" | "right"; onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <span
      onPointerDown={onPointerDown}
      // Right handles sit above left ones so both stay reachable where a transition overlaps two clips.
      className={`absolute top-0 ${side === "left" ? "left-0 z-10 rounded-l-md" : "right-0 z-20 rounded-r-md"} h-full w-1.5 cursor-ew-resize bg-white/30 hover:bg-[#c6f24b]`}
    />
  );
}

export function SequenceTracks({
  seq,
  placed,
  totalSec,
  sources,
  pps,
  time,
  selection,
  isZh,
  onSelect,
  onSeek,
  onChange,
}: {
  seq: CanvasSequence;
  placed: readonly PlacedClip[];
  totalSec: number;
  sources: Record<string, SequenceSource>;
  pps: number;
  time: number;
  selection: SequenceSelection;
  isZh: boolean;
  onSelect: (selection: SequenceSelection) => void;
  onSeek: (sec: number) => void;
  onChange: (next: CanvasSequence) => void;
}) {
  // Live x offset of a clip being dragged to a new place.
  const [dragging, setDragging] = useState<{ id: string; dx: number } | null>(null);
  const span = Math.max(totalSec, 10) + 2;
  const width = span * pps;
  const tick = pps >= 40 ? 1 : pps >= 15 ? 5 : 10;
  const isSel = (kind: string, id: string) => selection?.kind === kind && selection.id === id;

  const seekFromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(totalSec, (e.clientX - rect.left) / pps)));
  };

  const lane = (label: string, icon: React.ReactNode, height: number, children: React.ReactNode) => (
    <div className="flex border-b border-white/6" style={{ height }}>
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-white/8 bg-[#10141c] px-2 text-[10px] font-semibold text-white/55"
        style={{ width: LABEL_W }}
      >
        {icon}
        {label}
      </div>
      <div className="relative" style={{ width }}>
        {children}
      </div>
    </div>
  );

  const layerRows = Math.max(1, seq.tracks.overlay.length);
  const audioRows = Math.max(1, seq.tracks.audio.length);

  return (
    <div className="nowheel relative min-w-max select-none">
      {/* Ruler: click or drag to move the playhead. */}
      <div className="flex h-6 border-b border-white/8">
        <div className="sticky left-0 z-20 shrink-0 border-r border-white/8 bg-[#10141c]" style={{ width: LABEL_W }} />
        <div
          className="relative cursor-pointer"
          style={{ width }}
          onPointerDown={(e) => {
            seekFromEvent(e);
            const rect = e.currentTarget.getBoundingClientRect();
            startDrag(e, pps, (d) => onSeek(Math.max(0, Math.min(totalSec, (e.clientX - rect.left) / pps + d))));
          }}
        >
          {Array.from({ length: Math.floor(span / tick) + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 h-full border-l border-white/10 pl-1 text-[9px] leading-6 text-white/40"
              style={{ left: i * tick * pps }}
            >
              {i * tick}s
            </span>
          ))}
        </div>
      </div>

      {lane(isZh ? "影片" : "Video", <Film className="h-3 w-3" />, 46, (
        <>
          {placed.map((p, index) => {
            const left = p.start * pps;
            const w = Math.max(6, (p.end - p.start) * pps);
            const source = sources[p.clip.ref];
            const offset = dragging?.id === p.clip.id ? dragging.dx * pps : 0;
            return (
              <div
                key={p.clip.id}
                className={`absolute top-1.5 h-[34px] cursor-grab rounded-md border text-[10px] text-white/90 active:cursor-grabbing ${
                  isSel("clip", p.clip.id) ? "border-[#c6f24b] bg-[#3b4a1a]" : "border-[#7c6cf0]/60 bg-[#2b2550]"
                } ${offset ? "z-30 opacity-80 shadow-xl" : ""}`}
                style={{ left: left + offset, width: w }}
                title={source?.label}
                onPointerDown={(e) => {
                  onSelect({ kind: "clip", id: p.clip.id });
                  startDrag(
                    e,
                    pps,
                    (dx) => setDragging({ id: p.clip.id, dx }),
                    (dx) => {
                      setDragging(null);
                      if (Math.abs(dx * pps) < 4) return;
                      const center = p.start + (p.end - p.start) / 2 + dx;
                      const to = placed.filter((o, i) => i !== index && o.start + (o.end - o.start) / 2 < center).length;
                      if (to !== index) onChange(reorderClips(seq, index, to));
                    },
                  );
                }}
              >
                <Handle
                  side="left"
                  onPointerDown={(e) => {
                    onSelect({ kind: "clip", id: p.clip.id });
                    startDrag(e, pps, (d) => onChange(patchClip(seq, p.clip.id, trimClip(p.clip, "in", d, source?.durationSec))));
                  }}
                />
                <div className="pointer-events-none truncate px-2.5 pt-1 font-semibold">
                  {index + 1}. {source?.label ?? "?"}
                </div>
                <div className="pointer-events-none truncate px-2.5 text-[9px] text-white/50">
                  {(p.end - p.start).toFixed(1)}s{p.clip.speed !== 1 ? ` · ${p.clip.speed}×` : ""}
                  {p.clip.muted ? (isZh ? " · 靜音" : " · muted") : ""}
                </div>
                <Handle
                  side="right"
                  onPointerDown={(e) => {
                    onSelect({ kind: "clip", id: p.clip.id });
                    startDrag(e, pps, (d) => onChange(patchClip(seq, p.clip.id, trimClip(p.clip, "out", d, source?.durationSec))));
                  }}
                />
              </div>
            );
          })}
          {/* Transition chips sit on the overlap between two clips. */}
          {placed.map((p) =>
            p.transitionSec > 0 ? (
              <button
                key={`t-${p.clip.id}`}
                type="button"
                onClick={() => onSelect({ kind: "clip", id: p.clip.id })}
                className="absolute top-0 z-20 h-3.5 -translate-x-1/2 cursor-pointer rounded-full border border-[#c6f24b]/60 bg-[#11141b] px-1.5 text-[8.5px] leading-3 text-[#c6f24b]"
                style={{ left: (p.start + p.transitionSec / 2) * pps }}
                title={p.clip.transitionIn?.effect}
              >
                {p.clip.transitionIn?.effect}
              </button>
            ) : null,
          )}
        </>
      ))}

      {lane(isZh ? "疊加" : "Layers", <Type className="h-3 w-3" />, layerRows * ROW + 6, (
        <>
          {seq.tracks.overlay.map((layer, row) => {
            const end = layer.endSec ?? totalSec;
            const label =
              layer.kind === "text" ? layer.text || (isZh ? "（空白文字）" : "(empty text)") : layer.ref ? sources[layer.ref]?.label ?? "?" : "?";
            return (
              <div
                key={layer.id}
                className={`absolute flex h-[22px] cursor-grab items-center gap-1 overflow-hidden rounded-md border px-2 text-[10px] ${
                  isSel("layer", layer.id) ? "border-[#c6f24b] bg-[#3b4a1a]" : "border-amber-400/50 bg-amber-500/15"
                }`}
                style={{ top: 3 + row * ROW, left: layer.startSec * pps, width: Math.max(8, (end - layer.startSec) * pps) }}
                onPointerDown={(e) => {
                  onSelect({ kind: "layer", id: layer.id });
                  startDrag(e, pps, (d) => onChange(patchLayer(seq, layer.id, shiftWindow({ ...layer, endSec: end }, d, totalSec))));
                }}
              >
                <Handle
                  side="left"
                  onPointerDown={(e) => {
                    onSelect({ kind: "layer", id: layer.id });
                    startDrag(e, pps, (d) => onChange(patchLayer(seq, layer.id, resizeLayer(layer, "start", d, totalSec))));
                  }}
                />
                {layer.kind === "text" ? <Type className="h-3 w-3 shrink-0" /> : <ImageIcon className="h-3 w-3 shrink-0" />}
                <span className="pointer-events-none truncate">{label}</span>
                <Handle
                  side="right"
                  onPointerDown={(e) => {
                    onSelect({ kind: "layer", id: layer.id });
                    startDrag(e, pps, (d) => onChange(patchLayer(seq, layer.id, resizeLayer(layer, "end", d, totalSec))));
                  }}
                />
              </div>
            );
          })}
        </>
      ))}

      {lane(isZh ? "音訊" : "Audio", <Music className="h-3 w-3" />, audioRows * ROW + 6, (
        <>
          {seq.tracks.audio.map((item, row) => {
            const len = audioItemSec(item, sources[item.ref]?.durationSec, totalSec);
            return (
              <div
                key={item.id}
                className={`absolute flex h-[22px] cursor-grab items-center gap-1 overflow-hidden rounded-md border px-2 text-[10px] ${
                  isSel("audio", item.id) ? "border-[#c6f24b] bg-[#3b4a1a]" : "border-sky-400/50 bg-sky-500/15"
                }`}
                style={{ top: 3 + row * ROW, left: item.startSec * pps, width: Math.max(8, len * pps) }}
                onPointerDown={(e) => {
                  onSelect({ kind: "audio", id: item.id });
                  startDrag(e, pps, (d) => onChange(patchAudio(seq, item.id, shiftWindow({ startSec: item.startSec }, d, totalSec))));
                }}
              >
                <BeatMarkers item={item} sourceSec={sources[item.ref]?.durationSec} totalSec={totalSec} pps={pps} />
                <Music className="h-3 w-3 shrink-0" />
                <span className="pointer-events-none truncate">
                  {sources[item.ref]?.label ?? "?"}
                  {item.duck ? (isZh ? " · 自動壓低" : " · ducked") : ""}
                  {item.loop ? (isZh ? " · 循環" : " · loop") : ""}
                </span>
              </div>
            );
          })}
        </>
      ))}

      {/* Playhead */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-[#c6f24b]"
        style={{ left: LABEL_W + time * pps }}
      >
        <span className="absolute -top-0.5 -left-1 h-2 w-2 rotate-45 bg-[#c6f24b]" />
      </div>
    </div>
  );
}

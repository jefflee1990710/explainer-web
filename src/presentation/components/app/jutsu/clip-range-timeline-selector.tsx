"use client";

import { useRef } from "react";
import {
  CLIP_RANGE_MAX_SECONDS,
  CLIP_RANGE_MIN_SECONDS,
  computeClipRangeDragUpdate,
  detectClipRangeDragMode,
  resolveRangeTrackMaxDuration,
  type ClipRangeDragMode,
} from "@/service/jutsu/clip-range-selector";

export function ClipRangeTimelineSelector({
  sourceDuration,
  sectionStart,
  sectionLength,
  disabled = false,
  isEn,
  onChange,
  onPreviewTime,
}: {
  sourceDuration: number;
  sectionStart: number;
  sectionLength: number;
  disabled?: boolean;
  isEn: boolean;
  onChange: (next: { sectionStart: number; sectionLength: number }) => void;
  onPreviewTime?: (seconds: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const maxDur = resolveRangeTrackMaxDuration(sourceDuration, sectionStart, sectionLength);
  const maxLen = Math.min(CLIP_RANGE_MAX_SECONDS, maxDur);
  const startPct = Math.min(100, (sectionStart / maxDur) * 100);
  const widthPct = Math.min(100 - startPct, (sectionLength / maxDur) * 100);

  function startPointerDrag(
    e: React.PointerEvent<HTMLDivElement>,
    explicitMode?: ClipRangeDragMode,
  ) {
    if (disabled) return;
    const trackEl = trackRef.current;
    if (!trackEl) return;
    e.stopPropagation();

    const rect = trackEl.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const startClientX = e.clientX;
    const initialStart = sectionStart;
    const initialLength = sectionLength;

    const handleTarget = (e.target as HTMLElement | null)?.closest("[data-range-handle]");
    const handleAttr = handleTarget?.getAttribute("data-range-handle");
    const pointerRatio = Math.min(1, Math.max(0, (startClientX - rect.left) / width));

    const mode: ClipRangeDragMode =
      explicitMode ??
      (handleAttr === "start" || handleAttr === "end" || handleAttr === "move"
        ? handleAttr
        : detectClipRangeDragMode({
            ratio: pointerRatio,
            sectionStart: initialStart,
            sectionLength: initialLength,
            maxDuration: maxDur,
          }));

    // If user clicked outside the selection bar on the grey track, jump center to pointer first, then allow dragging
    const selectionStartRatio = initialStart / maxDur;
    const selectionEndRatio = (initialStart + initialLength) / maxDur;
    const clickedOutsideSelection =
      mode === "move" &&
      !handleAttr &&
      (pointerRatio < selectionStartRatio || pointerRatio > selectionEndRatio);

    const anchorStart = clickedOutsideSelection
      ? Math.min(
          Math.max(0, maxDur - initialLength),
          Math.max(0, pointerRatio * maxDur - initialLength / 2),
        )
      : initialStart;

    const applyAtClientX = (clientX: number) => {
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / width));
      const pointerSec = ratio * maxDur;
      const deltaSec = ((clientX - startClientX) / width) * maxDur;
      const updated = computeClipRangeDragUpdate({
        mode,
        deltaSec,
        pointerSec,
        initialStart: anchorStart,
        initialLength,
        maxDuration: maxDur,
        minLength: CLIP_RANGE_MIN_SECONDS,
        maxLength: maxLen,
      });
      onChange({
        sectionStart: updated.sectionStart,
        sectionLength: updated.sectionLength,
      });
      onPreviewTime?.(updated.previewTime);
    };

    trackEl.setPointerCapture(e.pointerId);
    applyAtClientX(startClientX);

    const onMove = (ev: PointerEvent) => applyAtClientX(ev.clientX);
    const onUp = () => {
      trackEl.removeEventListener("pointermove", onMove);
      trackEl.removeEventListener("pointerup", onUp);
      trackEl.removeEventListener("pointercancel", onUp);
    };
    trackEl.addEventListener("pointermove", onMove);
    trackEl.addEventListener("pointerup", onUp);
    trackEl.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-4">
      <div className="flex items-center justify-between text-xs font-bold text-[#12141c]">
        <span>
          {isEn ? "Start" : "起點"}: {sectionStart.toFixed(1)}s
        </span>
        <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 text-[#c6f24b]">
          {sectionLength}s ({sectionStart.toFixed(1)}s –{" "}
          {(sectionStart + sectionLength).toFixed(1)}s)
        </span>
        <span>
          {isEn ? "End" : "終點"}: {(sectionStart + sectionLength).toFixed(1)}s
        </span>
      </div>

      {/* Visual draggable timeline range track: drag center to move, drag ends to resize */}
      <div
        ref={trackRef}
        onPointerDown={(e) => startPointerDrag(e)}
        className="relative h-10 w-full cursor-pointer touch-none overflow-hidden rounded-2xl bg-zinc-200 select-none"
      >
        <div
          data-range-handle="move"
          className="absolute inset-y-0 flex cursor-grab items-center justify-between rounded-2xl border-2 border-[#12141c] bg-[#c6f24b]/90 active:cursor-grabbing"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(8, widthPct)}%`,
          }}
        >
          {/* Left Handle: drag to change start & length */}
          <div
            data-range-handle="start"
            title={isEn ? "Drag to adjust start" : "拖曳調整起點與長度"}
            className="flex h-full w-4 shrink-0 cursor-ew-resize items-center justify-center"
          >
            <span className="h-5 w-1.5 rounded-full bg-[#12141c]" />
          </div>

          {/* Center Grip: drag to slide entire selection */}
          <div
            data-range-handle="move"
            title={isEn ? "Drag center to move selection" : "拖曳中間移動整段範圍"}
            className="flex h-full flex-1 cursor-grab items-center justify-center active:cursor-grabbing"
          />

          {/* Right Handle: drag to change end & length */}
          <div
            data-range-handle="end"
            title={isEn ? "Drag to adjust end" : "拖曳調整終點與長度"}
            className="flex h-full w-4 shrink-0 cursor-ew-resize items-center justify-center"
          >
            <span className="h-5 w-1.5 rounded-full bg-[#12141c]" />
          </div>
        </div>
      </div>

      {/* Interactive Start & Duration Sliders */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
            <span>{isEn ? "Start Time" : "起始位置 (Start)"}</span>
            <span>{sectionStart.toFixed(1)}s</span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, maxDur - CLIP_RANGE_MIN_SECONDS)}
            step={0.5}
            disabled={disabled}
            value={sectionStart}
            onChange={(e) => {
              const nextStart = Math.max(0, Number(e.target.value));
              const clampedLen = Math.min(
                sectionLength,
                Math.max(CLIP_RANGE_MIN_SECONDS, maxDur - nextStart),
              );
              onChange({ sectionStart: nextStart, sectionLength: clampedLen });
              onPreviewTime?.(nextStart);
            }}
            className="mt-1.5 w-full cursor-pointer accent-[#12141c]"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
            <span>
              {isEn
                ? `Duration (2s–${maxLen}s)`
                : `片段長度 (2–${maxLen}秒)`}
            </span>
            <span>{sectionLength}s</span>
          </span>
          <input
            type="range"
            min={CLIP_RANGE_MIN_SECONDS}
            max={maxLen}
            step={0.5}
            disabled={disabled}
            value={sectionLength}
            onChange={(e) => {
              const nextLen = Math.min(
                maxLen,
                Math.max(CLIP_RANGE_MIN_SECONDS, Number(e.target.value)),
              );
              const nextStart = Math.min(sectionStart, Math.max(0, maxDur - nextLen));
              onChange({ sectionStart: nextStart, sectionLength: nextLen });
              onPreviewTime?.(nextStart + nextLen);
            }}
            className="mt-1.5 w-full cursor-pointer accent-[#12141c]"
          />
        </label>
      </div>
    </div>
  );
}

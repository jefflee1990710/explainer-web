"use client";

import { useRef, useState } from "react";
import type { JutsuPlacementBox } from "@/model/jutsu-job";

// Interactive bounding-box placement canvas ported from Openjutsu's `components/object-placement.tsx`.
export function JutsuPlacementBoxEditor({
  videoUrl,
  box,
  onChange,
  disabled,
}: {
  videoUrl?: string;
  box?: JutsuPlacementBox;
  onChange: (next?: JutsuPlacementBox) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  function toRelativeCoords(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">
          框選新增物件位置（喺畫面拖曳畫出方框）
        </span>
        {box ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(undefined)}
            className="cursor-pointer text-xs font-semibold text-muted hover:text-red-600"
          >
            清除方框
          </button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        onPointerDown={(ev) => {
          if (disabled) return;
          ev.currentTarget.setPointerCapture(ev.pointerId);
          const pt = toRelativeCoords(ev.clientX, ev.clientY);
          setDragStart(pt);
          onChange({ x: pt.x, y: pt.y, width: 0.05, height: 0.05 });
        }}
        onPointerMove={(ev) => {
          if (!dragStart || disabled) return;
          const pt = toRelativeCoords(ev.clientX, ev.clientY);
          const x = Math.min(dragStart.x, pt.x);
          const y = Math.min(dragStart.y, pt.y);
          const width = Math.max(0.04, Math.abs(pt.x - dragStart.x));
          const height = Math.max(0.04, Math.abs(pt.y - dragStart.y));
          onChange({
            x: Math.round(x * 1000) / 1000,
            y: Math.round(y * 1000) / 1000,
            width: Math.round(Math.min(1 - x, width) * 1000) / 1000,
            height: Math.round(Math.min(1 - y, height) * 1000) / 1000,
          });
        }}
        onPointerUp={() => setDragStart(null)}
        className="relative aspect-video w-full cursor-crosshair select-none overflow-hidden rounded-2xl border border-accent-ink/20 bg-zinc-900"
      >
        {videoUrl ? (
          <video
            src={videoUrl}
            muted
            playsInline
            className="pointer-events-none h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-white/60">
            上傳來源影片後可在此框選物件位置
          </div>
        )}

        {box ? (
          <div
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
            className="pointer-events-none absolute rounded-lg border-2 border-lime bg-lime/20 shadow-[0_0_0_2px_rgba(18,20,28,0.65)]"
          >
            <span className="absolute -top-5 left-0 rounded bg-accent-ink px-1.5 py-0.5 text-[10px] font-bold text-lime">
              {Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

// Slider above the outfit grid. Left makes the tiles smaller, right makes them larger.

import { LayoutGrid } from "lucide-react";

export const OUTFIT_TILE_MIN = 64;
export const OUTFIT_TILE_MAX = 220;

export function CanvasOutfitGridSize({
  isZh,
  value,
  onChange,
}: {
  isZh: boolean;
  value: number;
  onChange: (px: number) => void;
}) {
  const label = isZh ? "格子大小" : "Grid size";
  return (
    <div className="sticky top-0 z-20 -mx-2.5 -mt-2.5 mb-2.5 flex items-center gap-2 border-b border-white/6 bg-[#0e121a]/95 px-2.5 py-1.5 backdrop-blur-md">
      <LayoutGrid className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
      <input
        type="range"
        min={OUTFIT_TILE_MIN}
        max={OUTFIT_TILE_MAX}
        step={4}
        value={value}
        aria-label={label}
        title={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-4 w-full cursor-pointer accent-[#c6f24b]"
      />
      <LayoutGrid className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
    </div>
  );
}

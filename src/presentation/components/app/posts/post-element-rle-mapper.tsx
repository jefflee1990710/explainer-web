"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DetectedPostElement, PostElementCategory } from "@/model/post";
import { decodeClientSparseRle } from "@/presentation/components/app/jutsu/jutsu-person-rle-mapper";
import { Spinner } from "@/presentation/components/spinner";

const CATEGORY_STYLE: Record<
  PostElementCategory,
  {
    hex: string;
    rgb: readonly [number, number, number];
    badgeBg: string;
    icon: string;
    labelEn: string;
    labelZh: string;
  }
> = {
  person: {
    hex: "#d4ff33",
    rgb: [212, 255, 51],
    badgeBg: "bg-[#c6f24b] text-[#12141c]",
    icon: "👤",
    labelEn: "People",
    labelZh: "人物",
  },
  object: {
    hex: "#38bdf8",
    rgb: [56, 189, 248],
    badgeBg: "bg-sky-400 text-zinc-950",
    icon: "📦",
    labelEn: "Objects",
    labelZh: "物件",
  },
  text: {
    hex: "#fbbf24",
    rgb: [251, 191, 36],
    badgeBg: "bg-amber-400 text-zinc-950",
    icon: "🔤",
    labelEn: "Text",
    labelZh: "文字",
  },
};

export function PostElementRleOverlay({
  elements,
  activeElementId,
  categoryFilter,
  onSelectElement,
  isEn,
}: {
  elements: readonly DetectedPostElement[];
  activeElementId: string | null;
  categoryFilter: "all" | PostElementCategory;
  onSelectElement: (id: string) => void;
  isEn: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const visibleElements = useMemo(() => {
    if (categoryFilter === "all") return elements;
    return elements.filter((e) => e.category === categoryFilter);
  }, [elements, categoryFilter]);

  const decodedMasks = useMemo(() => {
    return visibleElements.map((element) => ({
      element,
      mask: decodeClientSparseRle(element.rle, element.width, element.height),
    }));
  }, [visibleElements]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (decodedMasks.length === 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const w = decodedMasks[0]!.element.width;
    const h = decodedMasks[0]!.element.height;
    if (w <= 0 || h <= 0) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (const { element, mask } of decodedMasks) {
      const style = CATEGORY_STYLE[element.category];
      const [cr, cg, cb] = style.rgb;
      const isActive = element.id === activeElementId;

      const fillAlpha = isActive ? 96 : 34;
      const edgeAlpha = isActive ? 255 : 155;

      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          const pIdx = row + x;
          if (!mask[pIdx]) continue;

          const isEdge =
            x === 0 ||
            x === w - 1 ||
            y === 0 ||
            y === h - 1 ||
            !mask[pIdx - 1] ||
            !mask[pIdx + 1] ||
            !mask[pIdx - w] ||
            !mask[pIdx + w];

          const outIdx = pIdx * 4;
          data[outIdx] = cr;
          data[outIdx + 1] = cg;
          data[outIdx + 2] = cb;
          data[outIdx + 3] = isEdge ? edgeAlpha : fillAlpha;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [decodedMasks, activeElementId]);

  if (visibleElements.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <canvas
        ref={canvasRef}
        onClick={(ev) => {
          const canvas = canvasRef.current;
          if (!canvas || decodedMasks.length === 0) return;
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const nx = (ev.clientX - rect.left) / rect.width;
          const ny = (ev.clientY - rect.top) / rect.height;

          for (const { element, mask } of decodedMasks) {
            const px = Math.min(
              element.width - 1,
              Math.max(0, Math.floor(nx * element.width)),
            );
            const py = Math.min(
              element.height - 1,
              Math.max(0, Math.floor(ny * element.height)),
            );
            if (mask[py * element.width + px]) {
              ev.stopPropagation();
              onSelectElement(element.id);
              return;
            }
          }
        }}
        className="pointer-events-auto h-full w-full cursor-pointer object-contain"
      />

      {visibleElements.map((element) => {
        const style = CATEGORY_STYLE[element.category];
        const isActive = element.id === activeElementId;
        const leftPct = Math.min(
          88,
          Math.max(8, (element.box.x + element.box.width / 2) * 100),
        );
        const topPct = Math.min(88, Math.max(6, element.box.y * 100));
        const displayLabel = isEn
          ? element.label
          : element.labelZh || element.label;

        return (
          <button
            key={element.id}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onSelectElement(element.id);
            }}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            className={`pointer-events-auto absolute -translate-x-1/2 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md transition ${
              isActive
                ? `${style.badgeBg} ring-2 ring-white scale-105`
                : "bg-zinc-900/85 text-white hover:bg-zinc-900"
            }`}
          >
            {style.icon} {displayLabel}
          </button>
        );
      })}
    </div>
  );
}

export function PostElementTabsBar({
  elements,
  detecting,
  activeElementId,
  categoryFilter,
  onCategoryFilterChange,
  onSelectElement,
  onRedetect,
  disabled,
  isEn,
}: {
  elements: readonly DetectedPostElement[];
  detecting: boolean;
  activeElementId: string | null;
  categoryFilter: "all" | PostElementCategory;
  onCategoryFilterChange: (cat: "all" | PostElementCategory) => void;
  onSelectElement: (id: string) => void;
  onRedetect: () => void;
  disabled?: boolean;
  isEn: boolean;
}) {
  const counts = useMemo(() => {
    const map = { person: 0, object: 0, text: 0 };
    for (const el of elements) {
      map[el.category] = (map[el.category] || 0) + 1;
    }
    return map;
  }, [elements]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return elements;
    return elements.filter((e) => e.category === categoryFilter);
  }, [elements, categoryFilter]);

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-[#12141c]">
            {detecting
              ? isEn
                ? "Detecting people, objects & text…"
                : "正在偵測畫面人物、物件與文字…"
              : elements.length > 0
                ? isEn
                  ? `Detected ${elements.length} elements — click any mask or chip to edit`
                  : `已偵測 ${elements.length} 個元素（點擊畫面輪廓或下方標籤即可單獨重繪修改）`
                : isEn
                  ? "No elements detected yet (click Redetect to scan)"
                  : "尚未偵測到可編輯元素（可按「重新偵測元素」掃描海報）"}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || detecting}
          onClick={onRedetect}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold text-[#12141c] transition hover:border-[#12141c] disabled:opacity-50"
        >
          {detecting ? <Spinner className="h-3 w-3" /> : <span>↻</span>}
          <span>{isEn ? "Redetect Elements" : "重新偵測元素"}</span>
        </button>
      </div>

      {/* Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "person", "object", "text"] as const).map((cat) => {
          const active = categoryFilter === cat;
          const label =
            cat === "all"
              ? isEn
                ? `All (${elements.length})`
                : `全部 (${elements.length})`
              : `${CATEGORY_STYLE[cat].icon} ${isEn ? CATEGORY_STYLE[cat].labelEn : CATEGORY_STYLE[cat].labelZh} (${counts[cat]})`;
          return (
            <button
              key={cat}
              type="button"
              disabled={disabled}
              onClick={() => onCategoryFilterChange(cat)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-[#12141c] text-[#c6f24b]"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Element Chips */}
      {filtered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5" role="tablist">
          {filtered.map((el) => {
            const style = CATEGORY_STYLE[el.category];
            const active = el.id === activeElementId;
            const displayLabel = isEn ? el.label : el.labelZh || el.label;
            return (
              <button
                key={el.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onSelectElement(el.id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-xs transition ${
                  active
                    ? "border-2 border-[#12141c] bg-white font-extrabold text-[#12141c] ring-2 ring-[#c6f24b]"
                    : "border-zinc-200 bg-white/80 font-semibold text-zinc-700 hover:border-zinc-400"
                }`}
              >
                <span
                  style={{ backgroundColor: style.hex }}
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/30"
                />
                <span>
                  {style.icon} {displayLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

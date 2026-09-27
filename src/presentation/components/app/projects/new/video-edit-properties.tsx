"use client";

import { BRAND_ANCHORS, EDIT_LIMITS, type BookendClip, type BrandAnchor, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";

const ANCHOR_LABEL: Record<BrandAnchor, string> = {
  "top-left": "左上", "top-right": "右上", "bottom-left": "左下", "bottom-right": "右下", center: "置中",
};

// Numeric controls for the selected layer or image bookend.
export function VideoEditProperties({
  edit,
  selected,
  onLayerChange,
  onBookendChange,
}: {
  edit: VideoEdit;
  selected: EditSelection;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
  onBookendChange: (slot: "intro" | "outro", patch: Partial<BookendClip>) => void;
}) {
  if (selected === "intro" || selected === "outro") {
    const clip = edit[selected];
    if (!clip || clip.kind !== "image") return null;
    const { min, max } = EDIT_LIMITS.imageDurationSec;
    return (
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{selected === "intro" ? "開頭" : "結尾"}屬性</h3>
        <Slider label="秒數" value={clip.durationSec} min={min} max={max} step={0.5} suffix=" 秒" onChange={(v) => onBookendChange(selected, { durationSec: v })} />
      </section>
    );
  }
  const layer = edit.layers.find((item) => item.id === selected);
  if (!layer) return null;
  const L = EDIT_LIMITS;
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">圖層屬性</h3>
      <div className="grid grid-cols-5 gap-1">
        {BRAND_ANCHORS.map((anchor) => (
          <button
            key={anchor}
            type="button"
            onClick={() => onLayerChange(layer.id, { anchor })}
            className={`min-h-8 rounded-md text-[11px] font-semibold ${layer.anchor === anchor ? "bg-[var(--studio-teal)] text-white" : "bg-[var(--studio-fill)]"}`}
          >
            {ANCHOR_LABEL[anchor]}
          </button>
        ))}
      </div>
      <Slider label="邊距" value={layer.marginPct} min={L.marginPct.min} max={L.marginPct.max} step={0.5} suffix="%" onChange={(v) => onLayerChange(layer.id, { marginPct: v })} />
      <Slider label="寬度" value={layer.widthPct} min={L.widthPct.min} max={L.widthPct.max} step={1} suffix="%" onChange={(v) => onLayerChange(layer.id, { widthPct: v })} />
      <Slider label="透明度" value={Math.round(layer.opacity * 100)} min={0} max={100} step={5} suffix="%" onChange={(v) => onLayerChange(layer.id, { opacity: v / 100 })} />
    </section>
  );
}

function Slider({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="flex justify-between">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-[var(--studio-muted)]">{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-[var(--studio-teal)]" />
    </label>
  );
}

"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { BRAND_ANCHORS, EDIT_LIMITS, type BookendClip, type BrandAnchor, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";

const ANCHOR_KEY: Record<BrandAnchor, keyof typeof anchorKeys> = {
  "top-left": "topLeft",
  "top-right": "topRight",
  "bottom-left": "bottomLeft",
  "bottom-right": "bottomRight",
  center: "center",
};

const anchorKeys = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
  center: true,
} as const;

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
  const { t } = useI18n();
  if (selected === "intro" || selected === "outro") {
    const clip = edit[selected];
    if (!clip || clip.kind !== "image") return null;
    const { min, max } = EDIT_LIMITS.imageDurationSec;
    const title =
      selected === "intro" ? t("video.properties.introAttrs") : t("video.properties.outroAttrs");
    return (
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{title}</h3>
        <Slider
          label={t("video.properties.duration")}
          value={clip.durationSec}
          min={min}
          max={max}
          step={0.5}
          suffix={t("video.properties.secondsSuffix")}
          onChange={(v) => onBookendChange(selected, { durationSec: v })}
        />
      </section>
    );
  }
  const layer = edit.layers.find((item) => item.id === selected);
  if (!layer) return null;
  const L = EDIT_LIMITS;
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{t("video.properties.layerAttrs")}</h3>
      <div className="grid grid-cols-5 gap-1">
        {BRAND_ANCHORS.map((anchor) => (
          <button
            key={anchor}
            type="button"
            onClick={() => onLayerChange(layer.id, { anchor })}
            className={`min-h-8 rounded-md text-[11px] font-semibold ${layer.anchor === anchor ? "bg-[var(--studio-teal)] text-white" : "bg-[var(--studio-fill)]"}`}
          >
            {t(`video.anchor.${ANCHOR_KEY[anchor]}`)}
          </button>
        ))}
      </div>
      <Slider
        label={t("video.properties.margin")}
        value={layer.marginPct}
        min={L.marginPct.min}
        max={L.marginPct.max}
        step={0.5}
        suffix="%"
        onChange={(v) => onLayerChange(layer.id, { marginPct: v })}
      />
      <Slider
        label={t("video.properties.width")}
        value={layer.widthPct}
        min={L.widthPct.min}
        max={L.widthPct.max}
        step={1}
        suffix="%"
        onChange={(v) => onLayerChange(layer.id, { widthPct: v })}
      />
      <Slider
        label={t("video.properties.opacity")}
        value={Math.round(layer.opacity * 100)}
        min={0}
        max={100}
        step={5}
        suffix="%"
        onChange={(v) => onLayerChange(layer.id, { opacity: v / 100 })}
      />
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="flex justify-between">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-[var(--studio-muted)]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-[var(--studio-teal)]"
      />
    </label>
  );
}

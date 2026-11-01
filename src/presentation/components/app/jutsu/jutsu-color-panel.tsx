"use client";

import type { JutsuColorSettings, JutsuToneMode } from "@/model/jutsu-job";
import { JUTSU_TONE_MODES } from "@/model/jutsu-job";
import {
  DEFAULT_JUTSU_COLOR_SETTINGS,
  DEFAULT_JUTSU_TONE,
  JUTSU_TONE_PRESETS,
} from "@/service/jutsu/color-grade";
import { useI18n } from "@/presentation/components/i18n-provider";

const TONE_SLIDERS: ReadonlyArray<{
  key: Exclude<keyof NonNullable<JutsuColorSettings["tone"]>, "mode">;
  labelEn: string;
  labelZh: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "exposure", labelEn: "Exposure", labelZh: "曝光 Exposure", min: -2, max: 2, step: 0.01 },
  { key: "contrast", labelEn: "Contrast", labelZh: "對比度 Contrast", min: 0.5, max: 1.5, step: 0.01 },
  { key: "highlight_rolloff", labelEn: "Highlight rolloff", labelZh: "高光柔化 Rolloff", min: 0, max: 1, step: 0.01 },
  { key: "shadow_lift", labelEn: "Shadow lift", labelZh: "暗部提亮 Shadow Lift", min: -0.5, max: 0.5, step: 0.01 },
  { key: "black_floor", labelEn: "Black floor", labelZh: "黑位下限 Black Floor", min: 0, max: 0.15, step: 0.01 },
  { key: "saturation", labelEn: "Saturation", labelZh: "飽和度 Saturation", min: 0.5, max: 1.5, step: 0.01 },
  { key: "strength", labelEn: "Strength", labelZh: "套用強度 Strength", min: 0, max: 1, step: 0.01 },
];

// Ported from Openjutsu's Fix Colours panel (`lib/color.ts`).
export function JutsuColorPanel({
  value,
  onChange,
  disabled,
}: {
  value: JutsuColorSettings;
  onChange: (next: JutsuColorSettings) => void;
  disabled?: boolean;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const tone = value.tone ?? DEFAULT_JUTSU_TONE;

  return (
    <div className="space-y-4 rounded-2xl border border-accent-ink/12 bg-paper/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isEn
              ? "H3 Soft Color Grade & Detail Contrast"
              : "H3 電影感柔化調色（Detail Contrast + DCTL Tone Mapper）"}
          </p>
          <p className="text-xs text-muted">
            {isEn
              ? "Softens crunchy fine detail (-0.20) and grades highlights & shadows with Orion4D's H3 Soft Reinhard curve."
              : "消除 AI 影片過份銳利嘅生硬顆粒感（預設 Detail -0.20），並套用 H3 Soft 曲線柔化高光、保護黑位。"}
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(DEFAULT_JUTSU_COLOR_SETTINGS)}
          className="cursor-pointer rounded-full border border-accent-ink/20 bg-white px-3 py-1 text-xs font-bold text-foreground hover:bg-lime/25"
        >
          {isEn ? "Reset to H3 Soft" : "重設為 H3 Soft 預設"}
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(JUTSU_TONE_PRESETS).map(([presetId, preset]) => (
          <button
            key={presetId}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({
                detail: value.detail ?? -0.2,
                tone: { ...preset.tone },
              })
            }
            className="cursor-pointer rounded-full border border-accent-ink/15 bg-white px-3 py-1 text-xs font-bold text-foreground transition hover:border-accent-ink/45"
          >
            {isEn ? preset.labelEn : preset.labelZh}
          </button>
        ))}
      </div>

      {/* Detail Contrast Slider */}
      <div className="rounded-xl border border-accent-ink/10 bg-white p-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span>
            {isEn
              ? "Fine Detail Contrast (-0.20 softens AI crunch)"
              : "微細節銳利度 Detail Contrast（-0.20 柔化生硬感）"}
          </span>
          <span className="tabular-nums text-accent-ink">
            {(value.detail ?? 0).toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          disabled={disabled}
          value={value.detail ?? -0.2}
          onChange={(ev) =>
            onChange({
              ...value,
              detail: Number(ev.target.value),
            })
          }
          className="mt-2 w-full accent-accent-ink"
        />
      </div>

      {/* Tone Mapper Controls */}
      <div className="rounded-xl border border-accent-ink/10 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold">
            {isEn ? "Tone Mapper Curve" : "色調映射曲線模式 (Tone Mode)"}
          </span>
          <select
            value={tone.mode}
            disabled={disabled}
            onChange={(ev) =>
              onChange({
                ...value,
                tone: { ...tone, mode: ev.target.value as JutsuToneMode },
              })
            }
            className="h-8 rounded-lg border border-accent-ink/20 bg-paper px-2.5 text-xs font-semibold"
          >
            {JUTSU_TONE_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TONE_SLIDERS.map((s) => (
            <label key={s.key} className="block">
              <div className="flex justify-between text-[11px] font-semibold text-muted">
                <span>{isEn ? s.labelEn : s.labelZh}</span>
                <span className="tabular-nums text-foreground">
                  {tone[s.key].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                disabled={disabled}
                value={tone[s.key]}
                onChange={(ev) =>
                  onChange({
                    ...value,
                    tone: { ...tone, [s.key]: Number(ev.target.value) },
                  })
                }
                className="mt-1 w-full accent-accent-ink"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

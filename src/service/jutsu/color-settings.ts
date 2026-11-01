import type { JutsuColorSettings, JutsuToneMode, JutsuToneSettings } from "@/model/jutsu-job";

// Client-safe color defaults and the FFmpeg filter builder.
// Keep Node/FFmpeg execution in color-grade.ts so Studio UI can import these values.

export const DEFAULT_JUTSU_TONE: JutsuToneSettings = {
  mode: "Reinhard",
  exposure: 0.09,
  contrast: 0.84,
  pivot: 0.69,
  highlight_rolloff: 0.27,
  shadow_lift: 0.15,
  black_floor: 0.03,
  saturation: 1.05,
  strength: 0.2,
};

export const DEFAULT_JUTSU_DETAIL_CONTRAST = -0.2;

export const DEFAULT_JUTSU_COLOR_SETTINGS: JutsuColorSettings = {
  detail: DEFAULT_JUTSU_DETAIL_CONTRAST,
  tone: DEFAULT_JUTSU_TONE,
};

export const JUTSU_TONE_PRESETS: Record<string, { labelZh: string; labelEn: string; tone: JutsuToneSettings }> = {
  "h3-soft": {
    labelZh: "H3 Soft（預設・柔化 AI 銳利感）",
    labelEn: "H3 Soft (Default · Softens H3 crunch)",
    tone: DEFAULT_JUTSU_TONE,
  },
  "filmic-soft": {
    labelZh: "Filmic Soft（柔和底片曲線）",
    labelEn: "Filmic Soft",
    tone: {
      mode: "Filmic Soft",
      exposure: 0.06,
      contrast: 0.9,
      pivot: 0.55,
      highlight_rolloff: 0.35,
      shadow_lift: 0.1,
      black_floor: 0.02,
      saturation: 1.04,
      strength: 0.25,
    },
  },
  "aces-cinematic": {
    labelZh: "ACES 電影暖色調",
    labelEn: "ACES Cinematic",
    tone: {
      mode: "ACES Approx",
      exposure: 0.04,
      contrast: 0.95,
      pivot: 0.5,
      highlight_rolloff: 0.4,
      shadow_lift: 0.08,
      black_floor: 0.02,
      saturation: 1.08,
      strength: 0.3,
    },
  },
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function round3(val: number) {
  return Math.round(val * 1000) / 1000;
}

/**
 * Build an FFmpeg `-vf` filter string that ports Openjutsu's `color.api.json`:
 * 1. `detail` (`-1` to `1`, default `-0.20`): softens crunchy fine high-frequency AI detail via `unsharp`.
 * 2. `tone` (`Reinhard` / `Filmic Soft` / `ACES Approx` DCTL Tone Mapper): maps exposure, contrast,
 *    shadow_lift, black_floor, highlight_rolloff, and saturation blended by `strength`.
 */
export function buildJutsuColorFilter(settings: JutsuColorSettings): string {
  const filters: string[] = [];

  if (typeof settings.detail === "number" && Math.abs(settings.detail) > 0.005) {
    // Openjutsu detail_contrast -0.20 softens fine 3x3 luma detail without blurring edges.
    const amount = round3(clamp(settings.detail * 0.85, -1.2, 1.5));
    filters.push(`unsharp=3:3:${amount}:3:3:0.0`);
  }

  if (settings.tone && settings.tone.strength > 0.005) {
    const t = settings.tone;
    const s = clamp(t.strength, 0, 1);
    const modeBoost: Record<JutsuToneMode, number> = {
      Reinhard: 1.0,
      "Filmic Soft": 0.96,
      "Filmic Strong": 1.08,
      "ACES Approx": 1.04,
      "Cineon-ish": 0.94,
    };
    const m = modeBoost[t.mode] ?? 1.0;

    // Blend identity (1.0) with tone mapper parameters by `strength`
    const effectiveContrast = round3(clamp(1 + (t.contrast * m - 1) * s, 0.5, 1.6));
    const effectiveBrightness = round3(clamp(t.exposure * 0.12 * s, -0.3, 0.3));
    const effectiveSaturation = round3(clamp(1 + (t.saturation - 1) * s, 0.4, 1.8));
    filters.push(
      `eq=contrast=${effectiveContrast}:brightness=${effectiveBrightness}:saturation=${effectiveSaturation}`,
    );

    // Shadow lift + black floor + highlight rolloff curve
    const y0 = round3(clamp(t.black_floor * s, 0, 0.12));
    const yShadow = round3(clamp(0.25 + t.shadow_lift * 0.18 * s, 0.15, 0.4));
    const yHigh = round3(clamp(1 - t.highlight_rolloff * 0.14 * s, 0.82, 1.0));
    filters.push(`curves=all='0/${y0} 0.25/${yShadow} 0.75/0.76 1/${yHigh}'`);
  }

  filters.push("setsar=1");
  return filters.join(",");
}

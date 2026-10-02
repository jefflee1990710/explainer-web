import type { DurationPreset } from "@/model/project";

export function isDurationPreset(value: string): value is DurationPreset {
  return Object.prototype.hasOwnProperty.call(DURATION_PRESETS, value);
}

export const DURATION_PRESETS: Record<
  DurationPreset,
  { id: DurationPreset; label: string; hint: string; skillHint: string }
> = {
  // No word-count or clip-count budget; Phase A decides from the source.
  auto: {
    id: "auto",
    label: "Auto",
    hint: "Director decides",
    skillHint:
      "AUTO length: Choose targetDuration, clipCount, and each clip's durationSeconds from the source and this director's planning. Do not assume a fixed total length or a fixed clip count. Stay inside this skill's per-clip duration limits. End on a clean resting payoff — never a seamless loop.",
  },
  micro: {
    id: "micro",
    label: "4–8 秒微短片",
    hint: "1–2 段 clips",
    skillHint: "4–8s Micro short: ~10–20 English words (1–2 clips). End on a clean resting payoff — never a seamless loop.",
  },
  short: {
    id: "short",
    label: "15–20 秒短片",
    hint: "2–4 段 clips",
    skillHint:
      "15–20s Short / Listicle: ~35–50 English words (~2–4 clips).",
  },
  punchy: {
    id: "punchy",
    label: "30–45 秒拆解",
    hint: "4–6 段 clips",
    skillHint:
      "30–45s Punchy Breakdown: ~70–110 English words (~4–6 clips).",
  },
  full: {
    id: "full",
    label: "50–60 秒完整 explainer",
    hint: "7–10 段 clips",
    skillHint:
      "50–60s Full Explainer: ~120–150 English words (~7–10 clips).",
  },
};

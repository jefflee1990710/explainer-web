import type { DurationPreset } from "@/types/project";

export const DURATION_PRESETS: Record<
  DurationPreset,
  { id: DurationPreset; label: string; hint: string; skillHint: string }
> = {
  micro: {
    id: "micro",
    label: "4–8 秒微循環",
    hint: "1–2 段 clips",
    skillHint: "4–8s Micro Loop: ~10–20 English words (1–2 clips, seamless loop).",
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

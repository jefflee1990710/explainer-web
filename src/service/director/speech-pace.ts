import type { SpeechPace } from "@/model/project";

export const DEFAULT_SPEECH_PACE: SpeechPace = "medium";

export type SpeechPacePreset = {
  id: SpeechPace;
  label: string;
  sublabel: string;
  // Multiplier on the duration preset's spoken-word budget.
  budget: number;
  // Delivery words pasted into every clip's audio lock.
  delivery: string;
};

export const SPEECH_PACE_PRESETS: Record<SpeechPace, SpeechPacePreset> = {
  slow: {
    id: "slow",
    label: "慢",
    sublabel: "從容、句間停頓",
    budget: 0.8,
    delivery: "slow, unhurried pace with short pauses between sentences",
  },
  medium: {
    id: "medium",
    label: "中",
    sublabel: "自然對話速度",
    budget: 1,
    delivery: "moderate, natural conversational pace",
  },
  fast: {
    id: "fast",
    label: "快",
    sublabel: "輕快、少停頓",
    budget: 1.2,
    delivery: "brisk, energetic pace with minimal pauses",
  },
};

export const SPEECH_PACE_IDS = Object.keys(SPEECH_PACE_PRESETS) as SpeechPace[];

export function isSpeechPace(value: string): value is SpeechPace {
  return SPEECH_PACE_IDS.includes(value as SpeechPace);
}

export function resolveSpeechPace(value?: string): SpeechPace {
  return value && isSpeechPace(value) ? value : DEFAULT_SPEECH_PACE;
}

export function speechPaceDelivery(value?: string) {
  return SPEECH_PACE_PRESETS[resolveSpeechPace(value)].delivery;
}

// Phase A: duration follows the line at this pace. Do not stretch the line to fill 5s.
export function speechPaceSkillHint(value?: string) {
  const preset = SPEECH_PACE_PRESETS[resolveSpeechPace(value)];
  return [
    `Speaking pace: ${preset.id} — ${preset.delivery}.`,
    "Set every clip's durationSeconds from its own spoken line.",
    "Count about 4 Chinese or Cantonese characters, or 2.4 English words, per second,",
    `then divide by ${preset.budget} (slow 0.8 is longer, medium 1 stays, fast 1.2 is shorter).`,
    "Clamp every clip to 5–12 seconds.",
    "A short line stays 5 seconds. A longer line is 6–12 seconds.",
    "Do not pad, expand, or cut the line to force a 5-second clip.",
    "A clip with no spoken line is 5 seconds.",
  ].join(" ");
}

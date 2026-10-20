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

// Phase A: the duration preset's word budget assumes medium pace; scale it.
export function speechPaceSkillHint(value?: string) {
  const preset = SPEECH_PACE_PRESETS[resolveSpeechPace(value)];
  const scale =
    preset.budget === 1
      ? "Use the duration preset's spoken-word budget as written."
      : `Multiply the duration preset's spoken-word budget (and every clip's spoken units) by about ${preset.budget}.`;
  return `Speaking pace: ${preset.id} — ${preset.delivery}. ${scale} Every clip MUST be at least 5 seconds long (up to 12s max) and its englishVo MUST contain enough spoken words/characters to fill the entire clip duration without dead silence at the start or end (~22–28 Chinese/Cantonese characters or ~12–16 English words per 5 seconds at medium pace). Expand or combine short phrases so no clip has an under-filled VO.`;
}

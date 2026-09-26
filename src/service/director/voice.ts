import type { VoiceGender } from "@/model/project";

export const DEFAULT_VOICE_GENDER: VoiceGender = "male";

export type VoicePreset = {
  id: VoiceGender;
  label: string;
  sublabel: string;
  en: VoiceGender;
  skillHint: string;
  // Verbatim timbre lock pasted into every clip prompt. Do not rewrite per clip.
  fingerprint: string;
};

export const VOICE_PRESETS: Record<VoiceGender, VoicePreset> = {
  male: {
    id: "male",
    label: "男聲",
    sublabel: "成年男聲旁白",
    en: "male",
    skillHint:
      "Narrator voice lock: warm, engaging adult male voice. Never switch to a female voice.",
    fingerprint:
      "mid-low pitch, slightly chesty, warm and engaging, clear conversational delivery, moderate pace. Never switch speaker, gender, accent, or age; change only emotion or volume.",
  },
  female: {
    id: "female",
    label: "女聲",
    sublabel: "成年女聲旁白",
    en: "female",
    skillHint:
      "Narrator voice lock: warm, engaging adult female voice. Never switch to a male voice.",
    fingerprint:
      "mid pitch, warm and engaging, clear conversational delivery, moderate pace. Never switch speaker, gender, accent, or age; change only emotion or volume.",
  },
};

export const VOICE_IDS = Object.keys(VOICE_PRESETS) as VoiceGender[];

export const NO_BGM_RULE =
  "No background music, no BGM, no musical score, no underscore. Spoken audio and short synced SFX only.";

export function isVoiceGender(value: string): value is VoiceGender {
  return VOICE_IDS.includes(value as VoiceGender);
}

export function resolveVoiceGender(value?: string): VoiceGender {
  return value && isVoiceGender(value) ? value : DEFAULT_VOICE_GENDER;
}

// Phase A: lock the chosen voice and keep BGM out of the proposal.
export function phaseAAudioHint(voiceGender?: string) {
  const voice = VOICE_PRESETS[resolveVoiceGender(voiceGender)];
  return `${voice.skillHint} ${NO_BGM_RULE} bgmDirection and every clip bgmSfx must state there is no background music; SFX only.`;
}

// Phase B: the line MiniMax must hear for voice + silence under the VO.
export function phaseBAudioLock(input: {
  voiceGender?: string;
  languageLabel: string;
  bansNarration?: boolean;
}) {
  const voice = VOICE_PRESETS[resolveVoiceGender(input.voiceGender)];
  const speaker = input.bansNarration
    ? `Character dialogue uses the same natural adult ${voice.en} speaking voice on every clip: ${voice.fingerprint}`
    : `Same narrator on every clip: a warm, engaging adult ${voice.en} voice speaking ${input.languageLabel}, ${voice.fingerprint}`;
  return `${speaker} ${NO_BGM_RULE}`;
}

export function finalizePhaseBPrompt(prompt: string, lock: string) {
  const trimmed = prompt.trim();
  return trimmed.includes(lock) ? trimmed : `${trimmed}\n\n${lock}`;
}

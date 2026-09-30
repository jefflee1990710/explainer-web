import type { VoiceGender } from "@/model/project";
import { speechPaceDelivery } from "@/service/director/speech-pace";

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
      "mid-low pitch, slightly chesty, warm and engaging, clear conversational delivery. Never switch speaker, gender, accent, or age; change only emotion or volume.",
  },
  female: {
    id: "female",
    label: "女聲",
    sublabel: "成年女聲旁白",
    en: "female",
    skillHint:
      "Narrator voice lock: warm, engaging adult female voice. Never switch to a male voice.",
    fingerprint:
      "mid pitch, warm and engaging, clear conversational delivery. Never switch speaker, gender, accent, or age; change only emotion or volume.",
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

// Phase A: lock the chosen narrator, or leave character voices for Phase B.
export function phaseAAudioHint(
  voiceGender?: string,
  options?: { bansNarration?: boolean },
) {
  if (options?.bansNarration) {
    return `No narrator and no third-person voiceover. Spoken audio is character dialogue only; each speaker's voice is chosen when the clip video is generated, matching that character. ${NO_BGM_RULE} bgmDirection and every clip bgmSfx must state there is no background music; SFX only.`;
  }
  const voice = VOICE_PRESETS[resolveVoiceGender(voiceGender)];
  return `${voice.skillHint} ${NO_BGM_RULE} bgmDirection and every clip bgmSfx must state there is no background music; SFX only.`;
}

// Phase B: MiniMax hears this for voice + silence under the spoken line.
export function phaseBAudioLock(input: {
  voiceGender?: string;
  languageLabel: string;
  bansNarration?: boolean;
  speechPace?: string;
}) {
  const pace = `Speaking pace on every clip: ${speechPaceDelivery(input.speechPace)}.`;
  const speaker = input.bansNarration
    ? `There is no narrator. Each named speaker uses a distinct natural voice that matches that character's apparent gender, age, and look in the locked start/end frames and in Phase A characterLock. The same NAME keeps the same voice, accent, and age on every clip. Do not invent a shared narrator timbre. Silent beats stay silent.`
    : (() => {
        const voice = VOICE_PRESETS[resolveVoiceGender(input.voiceGender)];
        return `Same narrator on every clip: a warm, engaging adult ${voice.en} voice speaking ${input.languageLabel}, ${voice.fingerprint}`;
      })();
  return `${speaker} ${pace} ${NO_BGM_RULE}`;
}

export function finalizePhaseBPrompt(prompt: string, lock: string) {
  const trimmed = prompt.trim();
  return trimmed.includes(lock) ? trimmed : `${trimmed}\n\n${lock}`;
}

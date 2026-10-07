import type { CharacterVoice } from "@/model/character-voice";
import type { VoiceGender } from "@/model/project";
import { dialogueVoiceLock } from "@/service/director/character-voice";
import { DIALOGUE_SPEAK_LOCK } from "@/service/director/spoken-line";
import { speechPaceDelivery } from "@/service/director/speech-pace";

type NamedVoice = { name: string; voice?: CharacterVoice | null };

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

function projectVoice(voiceGender?: string) {
  return VOICE_PRESETS[resolveVoiceGender(voiceGender)];
}

// Phase A: every speaking director copies a voice lock. Silent skills ignore this.
export function phaseAAudioHint(
  voiceGender?: string,
  options?: { bansNarration?: boolean; speakers?: NamedVoice[] },
) {
  const voice = projectVoice(voiceGender);
  const locked = dialogueVoiceLock(options?.speakers, `adult ${voice.en}, ${voice.fingerprint}`, {
    keepNarrator: !options?.bansNarration,
  });
  const tail = `${NO_BGM_RULE} bgmDirection and every clip bgmSfx must state there is no background music; SFX only.`;
  if (options?.bansNarration) {
    const voices = locked
      ? locked
      : `No narrator and no third-person voiceover. Every speaker uses this voice lock verbatim: warm, engaging adult ${voice.en} voice, ${voice.fingerprint} Do not invent a timbre from the look.`;
    return `${voices} ${tail}`;
  }
  if (locked) return `${locked}\nSpoken audio uses that voice lock verbatim. Do not invent a timbre from the look. ${tail}`;
  return `${voice.skillHint} Copy this voice lock verbatim. Do not invent a timbre from the look. ${tail}`;
}

// Phase B: MiniMax hears this for voice + silence under the spoken line.
export function phaseBAudioLock(input: {
  voiceGender?: string;
  languageLabel: string;
  bansNarration?: boolean;
  speechPace?: string;
  speakers?: NamedVoice[];
  silent?: boolean;
}) {
  if (input.silent) {
    return `No spoken words, no voiceover, no narrator, and no lip-sync. ${NO_BGM_RULE}`;
  }
  const pace = `Speaking pace on every clip: ${speechPaceDelivery(input.speechPace)}.`;
  const voice = projectVoice(input.voiceGender);
  const projectFingerprint = `adult ${voice.en}, ${voice.fingerprint}`;
  const locked = dialogueVoiceLock(input.speakers, projectFingerprint, {
    keepNarrator: !input.bansNarration,
  });
  const projectLock = `Same narrator on every clip: a warm, engaging adult ${voice.en} voice speaking ${input.languageLabel}, ${voice.fingerprint} Copy this voice lock verbatim. Do not invent a timbre from the look.`;
  const speaker = locked
    ? input.bansNarration
      ? `${locked} ${DIALOGUE_SPEAK_LOCK}`
      : `${locked} Spoken audio on every clip uses that voice lock verbatim. Do not invent a timbre from the look.`
    : input.bansNarration
      ? `There is no narrator. Every named speaker uses this voice lock verbatim: ${projectFingerprint} Do not invent a timbre from the frames or the look. The same NAME keeps this voice on every clip. ${DIALOGUE_SPEAK_LOCK}`
      : projectLock;
  return `${speaker} ${pace} ${NO_BGM_RULE}`;
}

export function finalizePhaseBPrompt(prompt: string, lock: string) {
  const trimmed = prompt.trim();
  return trimmed.includes(lock) ? trimmed : `${trimmed}\n\n${lock}`;
}

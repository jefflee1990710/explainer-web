import { voiceSwapVoiceId } from "@/model/character-voice-sample";
import { isTalkingHeadSkill } from "@/service/director/talking-head";

// Premade multilingual voice (Rachel). Speech-to-speech keeps the source timing,
// so a Cantonese talking-head still lip-syncs when the cast has no cloned demo.
export const CANTONESE_TALKING_HEAD_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

type VoiceSwapProject = {
  skillSlug?: string;
  language?: string;
  cast?: Array<{ voiceSample?: { elevenVoiceId?: string } | null }>;
};

// A one-character clone wins. Cantonese talking-head still converts without one.
export function resolveVoiceSwapId(project: VoiceSwapProject): string | null {
  const cloned = voiceSwapVoiceId(project.cast);
  if (cloned) return cloned;
  if (isTalkingHeadSkill(project.skillSlug) && project.language === "yue") {
    return CANTONESE_TALKING_HEAD_VOICE_ID;
  }
  return null;
}

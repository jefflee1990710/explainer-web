import { voiceSwapVoiceId } from "@/model/character-voice-sample";

// Premade multilingual voice (Rachel). Speech-to-speech keeps the source timing,
// so Cantonese lip-sync stays when the cast has no cloned demo.
export const CANTONESE_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

type VoiceSwapProject = {
  skillSlug?: string;
  language?: string;
  cast?: Array<{ voiceSample?: { elevenVoiceId?: string } | null }>;
};

// Only Cantonese leaves the video model's voice. A one-character clone wins;
// every other Cantonese director still converts on the premade voice.
export function resolveVoiceSwapId(project: VoiceSwapProject): string | null {
  if (project.language !== "yue") return null;
  return voiceSwapVoiceId(project.cast) || CANTONESE_VOICE_ID;
}

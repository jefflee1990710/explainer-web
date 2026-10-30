import { voiceSwapVoiceId } from "@/model/character-voice-sample";

// Premade multilingual voice (Rachel). Speech-to-speech keeps the source timing,
// so Cantonese lip-sync stays when the cast has no cloned demo.
export const CANTONESE_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

type VoiceSwapProject = {
  skillSlug?: string;
  language?: string;
  cast?: Array<{
    voiceSample?: { elevenVoiceId?: string } | null;
    voiceSamples?: Partial<Record<string, { elevenVoiceId?: string } | undefined>> | null;
  }>;
};

// Every voiced project synthesizes speech on ElevenLabs first across all languages.
// A one-character cloned voice (matching `language` first, then default `voiceSample`) wins;
// otherwise any project with a configured `language` falls back to the premade multilingual voice.
export function resolveVoiceSwapId(project: VoiceSwapProject): string | null {
  return (
    voiceSwapVoiceId(project.cast, project.language) ||
    (project.language ? CANTONESE_VOICE_ID : null)
  );
}

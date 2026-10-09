import { z } from "zod";

// Uploaded demo voice. Cloned once on ElevenLabs; clip audio is converted to it.
export const VOICE_SAMPLE_MIN_SECONDS = 5;
export const VOICE_SAMPLE_MAX_SECONDS = 120;
export const VOICE_SAMPLE_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_SAMPLE_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
] as const;

export type CharacterVoiceSample = {
  url: string;
  durationSeconds: number;
  // ElevenLabs Instant Voice Clone made from `url`.
  elevenVoiceId: string;
  uploadedAt: Date;
};

export const characterVoiceSampleSchema: z.ZodType<CharacterVoiceSample> = z.object({
  url: z.string(),
  durationSeconds: z.number(),
  elevenVoiceId: z.string(),
  uploadedAt: z.date(),
});

// Copied onto a video's cast so later sample changes do not touch existing clips.
export type CastVoiceSample = Pick<CharacterVoiceSample, "url" | "elevenVoiceId">;

export const castVoiceSampleSchema: z.ZodType<CastVoiceSample> = z.object({
  url: z.string(),
  elevenVoiceId: z.string(),
});

// Voice changer converts every voice on the track, so it only runs on a one-character cast.
export function voiceSwapVoiceId(
  cast?: Array<{ voiceSample?: { elevenVoiceId?: string } | null }>,
): string | null {
  if (!cast || cast.length !== 1) return null;
  return cast[0].voiceSample?.elevenVoiceId || null;
}

export function isVoiceSampleMime(type: string) {
  return (VOICE_SAMPLE_MIME_TYPES as readonly string[]).includes(type);
}

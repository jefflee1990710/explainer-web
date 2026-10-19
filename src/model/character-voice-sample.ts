import { z } from "zod";

// Uploaded demo voice. Cloned on ElevenLabs; clip audio is synthesized / converted to it.
export const VOICE_SAMPLE_MIN_SECONDS = 5;
export const VOICE_SAMPLE_MAX_SECONDS = 300;
export const VOICE_SAMPLE_MAX_FILES = 10;
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

export type CharacterVoiceSampleClip = {
  url: string;
  durationSeconds: number;
  name?: string;
};

export const characterVoiceSampleClipSchema: z.ZodType<CharacterVoiceSampleClip> = z.object({
  url: z.string(),
  durationSeconds: z.number(),
  name: z.string().optional(),
});

export type CharacterVoiceSample = {
  url: string;
  urls?: string[];
  clips?: CharacterVoiceSampleClip[];
  durationSeconds: number;
  // ElevenLabs Instant Voice Clone made from `clips` / `url`.
  elevenVoiceId: string;
  uploadedAt: Date;
};

export const characterVoiceSampleSchema: z.ZodType<CharacterVoiceSample> = z.object({
  url: z.string(),
  urls: z.array(z.string()).optional(),
  clips: z.array(characterVoiceSampleClipSchema).optional(),
  durationSeconds: z.number(),
  elevenVoiceId: z.string(),
  uploadedAt: z.date(),
});

export function normalizeVoiceSampleClips(
  sample?: Pick<CharacterVoiceSample, "url" | "durationSeconds" | "clips"> | null,
): CharacterVoiceSampleClip[] {
  if (!sample) return [];
  if (sample.clips && sample.clips.length > 0) return sample.clips;
  if (!sample.url) return [];
  return [{ url: sample.url, durationSeconds: sample.durationSeconds }];
}

export function voiceSampleUrls(
  sample?: Pick<CharacterVoiceSample, "url" | "urls" | "clips"> | null,
): string[] {
  if (!sample) return [];
  const urls = new Set<string>();
  if (sample.url) urls.add(sample.url);
  for (const url of sample.urls || []) {
    if (url) urls.add(url);
  }
  for (const clip of sample.clips || []) {
    if (clip.url) urls.add(clip.url);
  }
  return [...urls];
}

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

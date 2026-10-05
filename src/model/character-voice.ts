import { z } from "zod";

// Acoustic axes only. Personality, emotion, and pace are left out on purpose:
// those change per line, and a longer description gets rewritten between clips.
export const CHARACTER_VOICE_AGES = ["young-adult", "adult", "older"] as const;
export const CHARACTER_VOICE_PITCHES = ["low", "mid-low", "mid", "mid-high", "high"] as const;
export const CHARACTER_VOICE_RESONANCES = ["chesty", "mixed", "bright"] as const;
export const CHARACTER_VOICE_TEXTURES = ["warm", "dry", "soft", "crisp"] as const;
export const CHARACTER_VOICE_WEIGHTS = ["light", "medium", "heavy"] as const;
export const VOICE_NOTE_MAX = 50;

export type CharacterVoiceAge = (typeof CHARACTER_VOICE_AGES)[number];
export type CharacterVoicePitch = (typeof CHARACTER_VOICE_PITCHES)[number];
export type CharacterVoiceResonance = (typeof CHARACTER_VOICE_RESONANCES)[number];
export type CharacterVoiceTexture = (typeof CHARACTER_VOICE_TEXTURES)[number];
export type CharacterVoiceWeight = (typeof CHARACTER_VOICE_WEIGHTS)[number];

export const characterVoiceSchema = z.object({
  gender: z.enum(["male", "female"]),
  age: z.enum(CHARACTER_VOICE_AGES),
  pitch: z.enum(CHARACTER_VOICE_PITCHES),
  resonance: z.enum(CHARACTER_VOICE_RESONANCES),
  texture: z.enum(CHARACTER_VOICE_TEXTURES),
  // Optional so a lock saved before this axis still counts.
  weight: z.enum(CHARACTER_VOICE_WEIGHTS).optional(),
  // One short phrase. Longer text is cut so the clip prompt stays small.
  // null happens when an empty note was stored. Treat it as no extra line.
  note: z
    .string()
    .nullish()
    .transform((value) => {
      const note = value?.replace(/\s+/g, " ").trim().slice(0, VOICE_NOTE_MAX);
      return note || undefined;
    }),
});

// Parsed notes are `string | undefined`, which would force every object to set `note`.
// Call sites may omit it when there is no extra line.
type ParsedCharacterVoice = z.output<typeof characterVoiceSchema>;
export type CharacterVoice = Omit<ParsedCharacterVoice, "note"> & { note?: string };

export function parseCharacterVoice(value: unknown): CharacterVoice | null {
  const parsed = characterVoiceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Drop an empty note so Mongo does not store it as null.
export function characterVoiceForStorage(voice: CharacterVoice): CharacterVoice {
  const parsed = parseCharacterVoice(voice) ?? voice;
  if (parsed.note) return parsed;
  const rest = { ...parsed };
  delete rest.note;
  return rest;
}

export function isCharacterVoice(value: unknown): value is CharacterVoice {
  return parseCharacterVoice(value) !== null;
}

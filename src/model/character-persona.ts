import { z } from "zod";

// How the character talks. Kept off the voice lock so the timbre stays fixed.
export const PERSONA_WARMTH = ["warm", "direct", "sharp"] as const;
export const PERSONA_PACE = ["slow", "even", "quick"] as const;
export const PERSONA_HUMOR = ["straight", "playful", "teasing"] as const;

export const PERSONA_CITY_MAX = 40;
export const PERSONA_SUMMARY_MAX = 80;
export const PERSONA_INTEREST_MAX = 24;
export const PERSONA_INTERESTS_MAX = 6;

export type PersonaWarmth = (typeof PERSONA_WARMTH)[number];
export type PersonaPace = (typeof PERSONA_PACE)[number];
export type PersonaHumor = (typeof PERSONA_HUMOR)[number];

export type CharacterPersona = {
  city: string;
  warmth: PersonaWarmth;
  pace: PersonaPace;
  humor: PersonaHumor;
  summary: string;
  interests: string[];
};

const interest = z.string().trim().min(1).max(PERSONA_INTEREST_MAX);

export const characterPersonaSchema: z.ZodType<CharacterPersona> = z.object({
  city: z.string().trim().max(PERSONA_CITY_MAX),
  warmth: z.enum(PERSONA_WARMTH),
  pace: z.enum(PERSONA_PACE),
  humor: z.enum(PERSONA_HUMOR),
  summary: z.string().trim().max(PERSONA_SUMMARY_MAX),
  interests: z.array(interest).max(PERSONA_INTERESTS_MAX),
});

export function parseCharacterPersona(value: unknown): CharacterPersona | null {
  const parsed = characterPersonaSchema.safeParse(value);
  if (!parsed.success) return null;
  const persona = parsed.data;
  if (!persona.city && !persona.summary && persona.interests.length === 0) return null;
  return persona;
}

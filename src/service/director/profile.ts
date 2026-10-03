import { PROFILE_KEYS, type DirectorProfile, type SystemProfile } from "@/model/director-profile";

// Character limits for one profile field and for a custom director's extra instructions.
export const PROFILE_FIELD_MAX = 600;
export const EXTRA_INSTRUCTIONS_MAX = 4000;

// English field headings used in the run-time prompt and the chat model prompt.
export const PROFILE_LABELS_EN: Record<(typeof PROFILE_KEYS)[number], string> = {
  bestFor: "Best for",
  structure: "Length & clips",
  hook: "Opening hook",
  arc: "Story structure",
  narrator: "Narrator & cast",
  visual: "Visual world & palette",
  audio: "Music & sound",
  rules: "Key rules",
};

// Profile with every field present and blank.
export function emptyProfile(): DirectorProfile {
  return Object.fromEntries(PROFILE_KEYS.map((key) => [key, ""])) as DirectorProfile;
}

// Untrusted input → profile with every key as a string; unknown keys dropped.
export function parseProfile(
  raw: unknown,
): { ok: true; profile: DirectorProfile } | { ok: false; error: string } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const profile = emptyProfile();
  for (const key of PROFILE_KEYS) {
    const value = source[key];
    profile[key] = value === undefined || value === null ? "" : String(value);
    if (profile[key].length > PROFILE_FIELD_MAX) return { ok: false, error: "欄位內容過長" };
  }
  return { ok: true, profile };
}

// Seed / Mongo: `{ en: fields }` or a flat English profile. zh-Hant is ignored.
export function parseSystemProfile(raw: unknown): SystemProfile {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const block = (source.en && typeof source.en === "object" ? source.en : source) as Record<string, unknown>;
  const profile = emptyProfile();
  for (const key of PROFILE_KEYS) {
    const value = block[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`profile ${key} is empty`);
    if (value.length > PROFILE_FIELD_MAX) throw new Error(`profile ${key} is too long`);
    profile[key] = value;
  }
  return profile;
}

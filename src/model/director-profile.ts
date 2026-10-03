// Ordered profile fields shown for every director (shaped like a Phase A proposal).
// Kept off skill.ts so client UI never pulls mongodb/zod into the bundle.
export const PROFILE_KEYS = ["bestFor", "structure", "hook", "arc", "narrator", "visual", "audio", "rules"] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];
export type DirectorProfile = Record<ProfileKey, string>;
// System directors store one English profile.
export type SystemProfile = DirectorProfile;

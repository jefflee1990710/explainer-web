// Client-safe shot kinds and creation tab modes. The document schema stays in life-shot.ts so the browser never loads MongoDB.
export const LIFE_SHOT_KINDS = ["selfie", "food", "street", "hobby"] as const;
export const LIFE_SHOT_SOURCES = ["search", "upload"] as const;
export const LIFE_CREATE_MODES = ["replace-person", "scene-place", "post-template"] as const;

export type LifeShotKind = (typeof LIFE_SHOT_KINDS)[number];
export type LifeShotSource = (typeof LIFE_SHOT_SOURCES)[number];
export type LifeCreateMode = (typeof LIFE_CREATE_MODES)[number];

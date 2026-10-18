// Client-safe shot kinds. The document schema stays in life-shot.ts so the browser never loads MongoDB.
export const LIFE_SHOT_KINDS = ["selfie", "food", "street", "hobby"] as const;
export const LIFE_SHOT_SOURCES = ["search", "upload"] as const;

export type LifeShotKind = (typeof LIFE_SHOT_KINDS)[number];
export type LifeShotSource = (typeof LIFE_SHOT_SOURCES)[number];

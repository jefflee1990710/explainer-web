// Client-safe ids. Do not import Mongo or the project document from this file.
export const SUBTITLE_LOOK_IDS = [
  "handwritten",
  "clean",
  "bold",
  "neon",
  "comic",
  "chalk",
  "gold",
  "typewriter",
  "graffiti",
  "sticker",
  "glitch",
  "brush",
  "outline",
] as const;

export type SubtitleLook = (typeof SUBTITLE_LOOK_IDS)[number];

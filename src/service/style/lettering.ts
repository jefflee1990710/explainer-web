// On-canvas VO / beat-title layout. The wording lives on each Mongo style.
export type StyleLettering = {
  letteringLayout: string;
  letteringLine1: string;
  letteringLine2: string;
  beatTitleLayout: string;
  reelLayout: string;
};

export const LETTERING_KEYS = [
  "letteringLayout",
  "letteringLine1",
  "letteringLine2",
  "beatTitleLayout",
  "reelLayout",
] as const;

export type LetteringKey = (typeof LETTERING_KEYS)[number];

function pickLettering(style: Partial<StyleLettering> | null | undefined, key: LetteringKey) {
  return style?.[key]?.trim() ?? "";
}

// Reads the style document only. A missing field stays empty.
export function resolveStyleLettering(style?: Partial<StyleLettering> | null): StyleLettering {
  return {
    letteringLayout: pickLettering(style, "letteringLayout"),
    letteringLine1: pickLettering(style, "letteringLine1"),
    letteringLine2: pickLettering(style, "letteringLine2"),
    beatTitleLayout: pickLettering(style, "beatTitleLayout"),
    reelLayout: pickLettering(style, "reelLayout"),
  };
}

// Pure: ASS style per subtitle look (the same ids the reel captions use) and screen position.
// Colors are ASS &HAABBGGRR (alpha 00 = solid).

import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";

export type SubtitleAssStyle = {
  primary: string;
  outline: string;
  back: string;
  bold: boolean;
  italic?: boolean;
  // 1 = outline + shadow, 3 = opaque box behind the text.
  borderStyle: 1 | 3;
  outlineWidth: number;
  shadow: number;
  // Font size relative to the default (height / 18).
  scale: number;
  spacing?: number;
};

const STYLES: Record<SubtitleLook, SubtitleAssStyle> = {
  clean: { primary: "&H00FFFFFF", outline: "&H00000000", back: "&H80000000", bold: true, borderStyle: 1, outlineWidth: 3, shadow: 0, scale: 1 },
  handwritten: { primary: "&H00FFFFFF", outline: "&H00303030", back: "&H00000000", bold: false, italic: true, borderStyle: 1, outlineWidth: 2, shadow: 1, scale: 1.05 },
  bold: { primary: "&H0000FFFF", outline: "&H00000000", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 5, shadow: 2, scale: 1.2 },
  neon: { primary: "&H00FFFF66", outline: "&H00FF00CC", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 4, shadow: 3, scale: 1.05 },
  comic: { primary: "&H0000E6FF", outline: "&H00000000", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 6, shadow: 3, scale: 1.15 },
  chalk: { primary: "&H00F0F0F0", outline: "&H00404A2F", back: "&H00000000", bold: false, borderStyle: 1, outlineWidth: 2, shadow: 0, scale: 1 },
  gold: { primary: "&H0037AFD4", outline: "&H00103050", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 3, shadow: 2, scale: 1.05 },
  typewriter: { primary: "&H00000000", outline: "&H00FFFFFF", back: "&H00F0F5FA", bold: false, borderStyle: 3, outlineWidth: 8, shadow: 0, scale: 0.95, spacing: 1 },
  graffiti: { primary: "&H005A28FF", outline: "&H00FFFFFF", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 5, shadow: 2, scale: 1.2 },
  sticker: { primary: "&H00000000", outline: "&H00FFFFFF", back: "&H00FFFFFF", bold: true, borderStyle: 3, outlineWidth: 10, shadow: 0, scale: 1.05 },
  glitch: { primary: "&H00FFFF00", outline: "&H00FF00FF", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 3, shadow: 4, scale: 1.05, spacing: 2 },
  brush: { primary: "&H00FFFFFF", outline: "&H001A1A1A", back: "&H00000000", bold: true, italic: true, borderStyle: 1, outlineWidth: 4, shadow: 2, scale: 1.1 },
  outline: { primary: "&H00000000", outline: "&H00FFFFFF", back: "&H00000000", bold: true, borderStyle: 1, outlineWidth: 4, shadow: 0, scale: 1.05 },
};

export const SUBTITLE_POSITIONS = ["bottom", "middle", "top"] as const;
export type SubtitlePosition = (typeof SUBTITLE_POSITIONS)[number];

export function subtitleAssStyle(look: unknown): SubtitleAssStyle {
  return SUBTITLE_LOOK_IDS.includes(look as SubtitleLook) ? STYLES[look as SubtitleLook] : STYLES.clean;
}

// ASS numpad alignment: 2 bottom center, 5 middle center, 8 top center.
export function subtitleAlignment(position: unknown): 2 | 5 | 8 {
  return position === "top" ? 8 : position === "middle" ? 5 : 2;
}

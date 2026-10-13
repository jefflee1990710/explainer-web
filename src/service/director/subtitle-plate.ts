import { subtitleLookLine, textStyleSampleLookLine } from "@/service/director/subtitle-look";
import { toWrittenChinese } from "@/service/director/written-chinese";
import type { VoLanguage } from "@/model/project";

export const PLATE_EMPTY_ERROR = "字幕圖沒有留下可疊上的字";

// Talking-head realistic paints the spoken line into the still, like every other skill.
// The separate green plate and the composite on top of the scene are off.
export function usesTalkingHeadSubtitleOverlay(_input: {
  skillSlug?: string;
  styleId?: string;
  baseStyleId?: string;
}) {
  return false;
}

export function subtitlePlatePrompt(input: {
  line: string;
  language?: VoLanguage;
  lookLine?: string;
  sampleImageIndex?: number;
}) {
  const words = input.language === "yue" ? toWrittenChinese(input.line) : input.line.trim();
  const look = input.sampleImageIndex
    ? textStyleSampleLookLine(input.sampleImageIndex)
    : input.lookLine?.trim() || subtitleLookLine();
  return [
    "Subtitle graphic only. Large phone-readable lettering. No person, no room, no logo, no second line.",
    look,
    `The only words are: ${words}`,
    "Include any paper strip, sticker, or stroke that belongs to the Look. Do not paint that Look's full-bleed field.",
    "The area outside the graphic is flat #00FF00. No pixel of the letters, paper, sticker, or shadow may be #00FF00.",
  ].join("\n");
}

// Chroma green and the green fringe on its edges. Black, white, and yellow stay opaque.
export function isGreenKeyPixel(r: number, g: number, b: number) {
  return g >= 140 && g > r + 50 && g > b + 50;
}

export function opaqueRatio(pixels: Array<{ r: number; g: number; b: number }>) {
  if (pixels.length === 0) return 0;
  const kept = pixels.filter((pixel) => !isGreenKeyPixel(pixel.r, pixel.g, pixel.b)).length;
  return kept / pixels.length;
}

export function plateIsEmpty(ratio: number) {
  return ratio < 0.01;
}

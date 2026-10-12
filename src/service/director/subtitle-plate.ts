import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { subtitleLookLine, textStyleSampleLookLine } from "@/service/director/subtitle-look";
import { toWrittenChinese } from "@/service/director/written-chinese";
import type { VoLanguage } from "@/model/project";

export const PLATE_EMPTY_ERROR = "字幕圖沒有留下可疊上的字";

export function usesTalkingHeadSubtitleOverlay(input: {
  skillSlug?: string;
  styleId?: string;
  baseStyleId?: string;
}) {
  const cinematic = input.styleId === "realistic" || input.baseStyleId === "realistic";
  return isTalkingHeadSkill(input.skillSlug) && cinematic;
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
    "The area outside the graphic is flat #FF00FF. No pixel of the letters, paper, sticker, or shadow may be #FF00FF.",
  ].join("\n");
}

export function isMagentaKeyPixel(r: number, g: number, b: number) {
  return r >= 215 && b >= 215 && g <= 40;
}

export function opaqueRatio(pixels: Array<{ r: number; g: number; b: number }>) {
  if (pixels.length === 0) return 0;
  const kept = pixels.filter((pixel) => !isMagentaKeyPixel(pixel.r, pixel.g, pixel.b)).length;
  return kept / pixels.length;
}

export function plateIsEmpty(ratio: number) {
  return ratio < 0.01;
}

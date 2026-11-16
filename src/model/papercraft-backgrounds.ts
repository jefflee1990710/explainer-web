import type { DirectorPresetBackground } from "@/model/director";

// Cardstock sheet colours the papercraft director can lock onto every frame.
export const PAPERCRAFT_BACKGROUND_IDS = [
  "cobalt",
  "cream",
  "mustard",
  "terracotta",
  "teal",
  "kraft",
] as const;

export type PapercraftBackgroundId = (typeof PAPERCRAFT_BACKGROUND_IDS)[number];

// Matches the style canvas colour so a new video keeps the current cobalt sheet.
export const DEFAULT_PAPERCRAFT_BACKGROUND_ID: PapercraftBackgroundId = "cobalt";

export const PAPERCRAFT_PRESET_BACKGROUNDS: readonly DirectorPresetBackground[] = [
  {
    id: "cobalt",
    nameEn: "Cobalt Cardstock",
    nameZhHant: "鈷藍卡紙",
    nameZhHans: "钴蓝卡纸",
    descriptionEn: "Deep editorial cobalt blue sheet behind every set.",
    descriptionZhHant: "整支片的滿版底紙都是同一張深藍鈷色卡紙。",
    surfaceNoun: "cobalt cardstock sheet",
    surfacePrompt:
      "one full-bleed deep cobalt blue 300gsm matte cardstock sheet (editorial blue, about #1E3A6D, visible paper fiber)",
    forbidSurfaces:
      "never a cream, mustard, terracotta, teal, or kraft backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room or white page margin",
    previewPrompt: "Full-bleed deep cobalt blue 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#1E3A6D",
  },
  {
    id: "cream",
    nameEn: "Warm Cream Cardstock",
    nameZhHant: "米白卡紙",
    nameZhHans: "米白卡纸",
    descriptionEn: "Warm ivory paper sheet, the lightest backdrop.",
    descriptionZhHant: "整支片的滿版底紙都是同一張溫暖米白卡紙。",
    surfaceNoun: "warm cream cardstock sheet",
    surfacePrompt:
      "one full-bleed warm cream ivory 300gsm matte cardstock sheet (soft paper white, about #F4E7D1, visible paper fiber)",
    forbidSurfaces:
      "never a cobalt, navy, mustard, terracotta, teal, or kraft backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room",
    previewPrompt: "Full-bleed warm cream ivory 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#F4E7D1",
  },
  {
    id: "mustard",
    nameEn: "Mustard Cardstock",
    nameZhHant: "芥末黃卡紙",
    nameZhHans: "芥末黄卡纸",
    descriptionEn: "Warm mustard yellow sheet behind every set.",
    descriptionZhHant: "整支片的滿版底紙都是同一張芥末黃卡紙。",
    surfaceNoun: "mustard cardstock sheet",
    surfacePrompt:
      "one full-bleed warm mustard yellow 300gsm matte cardstock sheet (about #E0B145, visible paper fiber)",
    forbidSurfaces:
      "never a cobalt, cream, terracotta, teal, or kraft backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room",
    previewPrompt: "Full-bleed warm mustard yellow 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#E0B145",
  },
  {
    id: "terracotta",
    nameEn: "Terracotta Cardstock",
    nameZhHant: "赤陶紅卡紙",
    nameZhHans: "赤陶红卡纸",
    descriptionEn: "Terracotta coral sheet behind every set.",
    descriptionZhHant: "整支片的滿版底紙都是同一張赤陶紅卡紙。",
    surfaceNoun: "terracotta cardstock sheet",
    surfacePrompt:
      "one full-bleed terracotta coral 300gsm matte cardstock sheet (about #D4654A, visible paper fiber)",
    forbidSurfaces:
      "never a cobalt, cream, mustard, teal, or kraft backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room",
    previewPrompt: "Full-bleed terracotta coral 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#D4654A",
  },
  {
    id: "teal",
    nameEn: "Deep Teal Cardstock",
    nameZhHant: "深青綠卡紙",
    nameZhHans: "深青绿卡纸",
    descriptionEn: "Deep teal sheet behind every set.",
    descriptionZhHant: "整支片的滿版底紙都是同一張深青綠卡紙。",
    surfaceNoun: "deep teal cardstock sheet",
    surfacePrompt:
      "one full-bleed deep teal 300gsm matte cardstock sheet (about #1F6A66, visible paper fiber)",
    forbidSurfaces:
      "never a cobalt, cream, mustard, terracotta, or kraft backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room",
    previewPrompt: "Full-bleed deep teal 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#1F6A66",
  },
  {
    id: "kraft",
    nameEn: "Kraft Cardstock",
    nameZhHant: "牛皮紙",
    nameZhHans: "牛皮纸",
    descriptionEn: "Natural kraft tan sheet behind every set.",
    descriptionZhHant: "整支片的滿版底紙都是同一張牛皮色卡紙。",
    surfaceNoun: "kraft cardstock sheet",
    surfacePrompt:
      "one full-bleed natural kraft tan 300gsm matte cardstock sheet (about #C6A36A, visible paper fiber)",
    forbidSurfaces:
      "never a cobalt, cream, mustard, terracotta, or teal backdrop, never dark letterbox bars, never a smaller mat floating on another colour, never a photographed room",
    previewPrompt: "Full-bleed natural kraft tan 300gsm cardstock paper texture, no objects.",
    previewUrl: "",
    swatch: "#C6A36A",
  },
] as const;

export function isPapercraftBackgroundId(
  value: string | undefined | null,
): value is PapercraftBackgroundId {
  return Boolean(value && (PAPERCRAFT_BACKGROUND_IDS as readonly string[]).includes(value));
}

export function resolvePapercraftBackground(id?: string | null): DirectorPresetBackground | undefined {
  if (!isPapercraftBackgroundId(id)) return undefined;
  return PAPERCRAFT_PRESET_BACKGROUNDS.find((bg) => bg.id === id);
}

// Empty when the video has no chosen colour, so older storyboards keep their own sheets.
export function papercraftBackdropLock(id?: string | null): string {
  const preset = resolvePapercraftBackground(id);
  if (!preset) return "";
  return `BACKGROUND COLOR LOCK: the full-bleed 300gsm cardstock backdrop, tabletop, and stage behind every prop is ${preset.surfacePrompt} on every clip. ${preset.forbidSurfaces}. Props and the optional figurine may use the other craft colours; the sheet behind them stays this one colour.`;
}

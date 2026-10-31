import type { DirectorPresetBackground } from "@/model/director";

export const PAPER_CUTOUT_BACKGROUND_IDS = [
  "wood-cardboard",
  "paper",
  "blueprint-paper",
  "concrete",
  "office-table",
  "sky",
] as const;

export type PaperCutoutBackgroundId = (typeof PAPER_CUTOUT_BACKGROUND_IDS)[number];

export const DEFAULT_PAPER_CUTOUT_BACKGROUND_ID: PaperCutoutBackgroundId = "wood-cardboard";

export const PAPER_CUTOUT_PRESET_BACKGROUNDS: readonly DirectorPresetBackground[] = [
  {
    id: "wood-cardboard",
    nameEn: "Wood Craft Board (Default)",
    nameZhHant: "木紋手作底板（預設）",
    nameZhHans: "木纹手作底板（默认）",
    descriptionEn: "Warm dark-brown vertically-grained wooden craft board.",
    descriptionZhHant: "溫潤深暖棕垂直木紋手作底板，白邊剪紙層次最鮮明。",
    surfaceNoun: "wooden craft board",
    surfacePrompt:
      "dark warm-brown vertically-grained wooden craft board",
    forbidSurfaces:
      "never a gridded cutting mat, never floor tiles, felt, plain black paper, 3D room, studio, sky, or easel",
    previewPrompt:
      "Flat top-down full-bleed background texture of a warm dark-brown vertically-grained wooden craft board surface, even soft overhead studio craft light, rich natural wood grain edge-to-edge, no objects, no people, no text, no borders.",
    previewUrl: "/director-backgrounds/paper-cutout/wood-cardboard.webp",
  },
  {
    id: "paper",
    nameEn: "Warm Craft Paper",
    nameZhHant: "溫潤手造紙底",
    nameZhHans: "温润手造纸底",
    descriptionEn: "Tactile warm cream-ivory handmade craft paper sheet.",
    descriptionZhHant: "溫潤米白手造纖維紙紋底面，乾淨清新富手作雜誌質感。",
    surfaceNoun: "craft paper sheet",
    surfacePrompt:
      "warm cream-ivory textured handmade craft paper surface with subtle natural paper fibers",
    forbidSurfaces:
      "never a wooden board, gridded cutting mat, concrete floor, 3D room, studio, sky, or easel",
    previewPrompt:
      "Flat top-down full-bleed background texture of warm cream-ivory handmade craft paper with subtle tactile cotton paper fibers and gentle paper grain, even overhead diffused light, edge-to-edge, no objects, no text, no borders.",
    previewUrl: "/director-backgrounds/paper-cutout/paper.webp",
  },
  {
    id: "blueprint-paper",
    nameEn: "Blueprint Grid Paper",
    nameZhHant: "工程藍圖方格紙",
    nameZhHans: "工程蓝图方格纸",
    descriptionEn: "Deep architectural cyan-blue blueprint paper with fine white drafting grid.",
    descriptionZhHant: "經典深藍建築工程藍圖方格紙，適合系統拆解、科技與工程教學。",
    surfaceNoun: "blueprint grid paper",
    surfacePrompt:
      "deep Prussian-blue architectural blueprint paper with a crisp fine white technical grid",
    forbidSurfaces:
      "never a wooden board, floor tiles, concrete, 3D room, studio, sky, or easel",
    previewPrompt:
      "Flat top-down full-bleed background texture of deep Prussian cyan-blue architectural blueprint paper with crisp fine white technical drafting grid lines and subtle paper grain, even overhead light, edge-to-edge, no objects, no text.",
    previewUrl: "/director-backgrounds/paper-cutout/blueprint-paper.webp",
  },
  {
    id: "concrete",
    nameEn: "Concrete Floor (石屎地)",
    nameZhHant: "石屎地（清水模水泥）",
    nameZhHans: "水泥地（清水模）",
    descriptionEn: "Raw urban matte grey concrete slab texture with subtle pores.",
    descriptionZhHant: "街頭工業風啞光灰石屎地／清水模水泥紋理，強烈現代感。",
    surfaceNoun: "concrete surface",
    surfacePrompt:
      "raw matte grey urban concrete floor surface (石屎地) with subtle natural mineral pores and troweled cement texture",
    forbidSurfaces:
      "never a wooden board, gridded cutting mat, 3D room perspective, studio walls, sky, or easel",
    previewPrompt:
      "Flat top-down full-bleed background texture of raw matte medium-grey architectural concrete floor slab with subtle mineral pores and smooth troweled cement grain, even overhead light, edge-to-edge, no objects, no text.",
    previewUrl: "/director-backgrounds/paper-cutout/concrete.webp",
  },
  {
    id: "office-table",
    nameEn: "Light Oak Office Desk",
    nameZhHant: "現代淺橡木辦公桌",
    nameZhHans: "现代浅橡木办公桌",
    descriptionEn: "Clean honey-oak modern office desk surface.",
    descriptionZhHant: "明亮淺橡木現代辦公桌面紋理，適合商業、職場與效率主題。",
    surfaceNoun: "office desk surface",
    surfacePrompt:
      "clean light honey-oak modern office table surface with smooth fine horizontal wood grain",
    forbidSurfaces:
      "never dark rough barn wood, gridded cutting mat, concrete floor, 3D room walls, sky, or easel",
    previewPrompt:
      "Flat top-down full-bleed background texture of a clean modern light honey-oak office desk tabletop with smooth fine wood grain, even bright overhead daylight, edge-to-edge, no objects, no text.",
    previewUrl: "/director-backgrounds/paper-cutout/office-table.webp",
  },
  {
    id: "sky",
    nameEn: "Daylight Blue Sky & Paper Clouds",
    nameZhHant: "晴朗藍天拼貼背景",
    nameZhHans: "晴朗蓝天拼贴背景",
    descriptionEn: "Bright sky-blue paper backdrop with soft layered white paper clouds.",
    descriptionZhHant: "柔和天藍色美術紙背景配少量淡淡白雲剪紙紋理，開揚輕快。",
    surfaceNoun: "sky paper backdrop",
    surfacePrompt:
      "flat sky-blue craft paper backdrop with subtle layered soft white paper-cutout clouds along the outer margins",
    forbidSurfaces:
      "never a wooden board, gridded cutting mat, concrete floor, 3D room, ground horizon, or easel",
    previewPrompt:
      "Flat square-on full-bleed background of sky-blue craft paper with a few soft minimal white paper-cutout clouds near the corners, tactile paper grain, even overhead craft lighting, edge-to-edge, no text, no people.",
    previewUrl: "/director-backgrounds/paper-cutout/sky.webp",
  },
] as const;

export function isPaperCutoutBackgroundId(
  value: string | undefined | null,
): value is PaperCutoutBackgroundId {
  return Boolean(
    value && (PAPER_CUTOUT_BACKGROUND_IDS as readonly string[]).includes(value),
  );
}

export function resolvePaperCutoutBackground(
  id?: string | null,
): DirectorPresetBackground {
  const found = PAPER_CUTOUT_PRESET_BACKGROUNDS.find((bg) => bg.id === id);
  return found ?? PAPER_CUTOUT_PRESET_BACKGROUNDS[0]!;
}

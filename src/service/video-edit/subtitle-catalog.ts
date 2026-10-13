import { SYSTEM_TEXT_STYLE_ORDER, isSubtitleLook, systemTextStylePreview } from "@/service/director/subtitle-look";
import type { SubtitleLook } from "@/model/subtitle-look-id";

export type SubtitleCatalogStyle = {
  id: string;
  name: string;
  previewUrl: string;
  drawLook: SubtitleLook;
};

export type SubtitleCatalogLine = {
  clipNumber: number;
  line: string;
};

export type SubtitleCatalogUi = {
  subtitles: string;
  hint: string;
  generate: string;
  generating: string;
  placed: string;
  placedPartial: string;
  noLines: string;
  noMatch: string;
};

export type SubtitleCatalog = {
  styles: SubtitleCatalogStyle[];
  lines: SubtitleCatalogLine[];
  selectedId: string;
  ui: SubtitleCatalogUi;
};

// Spoken line for one storyboard clip, in clip order. Blank rows are skipped.
export function buildSubtitleCatalog({
  clips,
  subtitleLook,
  textStyleId,
  textStyles,
  origin,
  label,
  ui,
}: {
  clips: Array<{ clipNumber: number; englishVo?: string; startVo?: string }>;
  subtitleLook: SubtitleLook;
  textStyleId?: string;
  textStyles: Array<{ id: string; name: string; imageUrl: string; baseLookId?: string }>;
  origin: string;
  label: (look: SubtitleLook) => string;
  ui: SubtitleCatalogUi;
}): SubtitleCatalog {
  const styles: SubtitleCatalogStyle[] = SYSTEM_TEXT_STYLE_ORDER.map((id) => ({
    id,
    name: label(id),
    previewUrl: `${origin}${systemTextStylePreview(id)}`,
    drawLook: id,
  }));
  for (const style of textStyles) {
    if (!style.id || !style.imageUrl) continue;
    styles.push({
      id: style.id,
      name: style.name,
      previewUrl: style.imageUrl,
      drawLook: style.baseLookId && isSubtitleLook(style.baseLookId) ? style.baseLookId : "handwritten",
    });
  }
  const lines = [...clips]
    .sort((a, b) => a.clipNumber - b.clipNumber)
    .flatMap((clip) => {
      const line = (clip.englishVo || clip.startVo || "").trim();
      if (!line) return [];
      return [{ clipNumber: clip.clipNumber, line }];
    });
  const selectedId = textStyleId && styles.some((style) => style.id === textStyleId) ? textStyleId : subtitleLook;
  return { styles, lines, selectedId, ui };
}

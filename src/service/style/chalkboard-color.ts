import type { StyleDoc } from "@/model/style-doc";
import type { Style } from "@/service/style/types";

export const CHALKBOARD_COLOR_ID = "chalkboard-color" as const;

// Pastel chalk on slate — the colourful sibling of monochrome `chalkboard`.
export const CHALKBOARD_COLOR_FIELDS = {
  name: "Color chalkboard",
  description: "深綠黑板、白色與粉彩粉筆手繪。",
  canvas: "dark green slate chalkboard with faint chalk-dust smudges",
  canvasColor: "#2f4f3f",
  look: "hand-drawn chalk illustration: white chalk strokes with rough dusty texture and slightly uneven pressure, sparse cross-hatch shading, coloured chalk used only for accents",
  palette: "dark green board, white chalk, pastel chalk accents in yellow, pink, light blue and mint",
  typography:
    "handwritten chalk lettering in white, all caps, slightly uneven with chalk-dust texture; key words underlined with a quick chalk stroke or boxed in a coloured chalk rectangle",
  motion:
    "chalk draws itself on stroke by stroke, erased areas leave a faint smear, elements wipe in and out like a hand drawing live",
  negatives: "white background, marker lines, photorealism, 3D, glossy fills, gradients, printed fonts",
  letteringLine2:
    "When line 2 exists, write it in yellow chalk inside a chalk-outlined rounded box. No printed font.",
} as const;

export function chalkboardColorStyle(lettering?: Partial<Style>): Style {
  return {
    id: CHALKBOARD_COLOR_ID,
    ...CHALKBOARD_COLOR_FIELDS,
    letteringLayout: lettering?.letteringLayout,
    letteringLine1: lettering?.letteringLine1,
    beatTitleLayout: lettering?.beatTitleLayout,
    reelLayout: lettering?.reelLayout,
  };
}

export function chalkboardColorDoc(chalkboard?: StyleDoc | null): StyleDoc {
  return {
    _id: CHALKBOARD_COLOR_ID,
    ...CHALKBOARD_COLOR_FIELDS,
    letteringLayout: chalkboard?.letteringLayout,
    letteringLine1: chalkboard?.letteringLine1,
    beatTitleLayout: chalkboard?.beatTitleLayout,
    reelLayout: chalkboard?.reelLayout,
    previewUrl: chalkboard?.previewUrl,
    previewFullUrl: chalkboard?.previewFullUrl,
    updatedAt: new Date(),
  };
}

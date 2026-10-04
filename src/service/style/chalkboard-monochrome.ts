import type { Style } from "@/service/style/types";

// System chalkboard is white chalk on slate only. Mongo still has pastel
// accents from the first seed; this override wins so sheets and frames stay
// monochrome even before that row is patched.
const CHALKBOARD_MONOCHROME = {
  description: "深綠黑板、白色粉筆手繪。",
  look: "hand-drawn chalk illustration: white chalk strokes with rough dusty texture and slightly uneven pressure, sparse white cross-hatch shading, no filled colour",
  palette: "dark green board and white chalk only; pale gray chalk dust for shade. No other hues.",
  typography:
    "handwritten chalk lettering in white, all caps, slightly uneven with chalk-dust texture; key words underlined with a white chalk stroke or boxed in a white chalk outline",
  negatives:
    "white background, marker lines, photorealism, 3D, glossy fills, gradients, printed fonts, skin tones, painted hair or clothing colour, pastel chalk, yellow chalk, pink chalk, blue chalk, mint chalk, coloured accents",
  letteringLine2:
    "When line 2 exists, write it in white chalk inside a chalk-outlined rounded box. No printed font. No coloured chalk.",
} as const;

export function applyChalkboardMonochrome(style: Style): Style {
  if (style.id !== "chalkboard") return style;
  return { ...style, ...CHALKBOARD_MONOCHROME };
}

import type { IStyle } from "@/model/style";

// Hardcoded style definition for "chalkboard-color".
export const chalkboardColorStyle: IStyle = {
  "id": "chalkboard-color",
  "name": "Color chalkboard",
  "description": "深綠黑板、白色與粉彩粉筆手繪。",
  "canvas": "dark green slate chalkboard with faint chalk-dust smudges",
  "canvasColor": "#2f4f3f",
  "look": "hand-drawn chalk illustration: white chalk strokes with rough dusty texture and slightly uneven pressure, sparse cross-hatch shading, coloured chalk used only for accents",
  "palette": "dark green board, white chalk, pastel chalk accents in yellow, pink, light blue and mint",
  "typography": "handwritten chalk lettering in white, all caps, slightly uneven with chalk-dust texture; key words underlined with a quick chalk stroke or boxed in a coloured chalk rectangle",
  "motion": "chalk draws itself on stroke by stroke, erased areas leave a faint smear, elements wipe in and out like a hand drawing live",
  "negatives": "white background, marker lines, photorealism, 3D, glossy fills, gradients, printed fonts",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is bold white chalk all-caps, dusty strokes on the dark slate.",
  "letteringLine2": "When line 2 exists, write it in yellow chalk inside a chalk-outlined rounded box. No printed font.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/chalkboard-color-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/chalkboard-color",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": true,
    "monochromeChalk": false
  }
};

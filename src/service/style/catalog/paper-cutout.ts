import type { IStyle } from "@/model/style";

// Hardcoded style definition for "paper-cutout".
export const paperCutoutStyle: IStyle = {
  "id": "paper-cutout",
  "name": "Paper cut-out",
  "description": "層疊色紙、手撕邊緣與微陰影的停格質感。",
  "canvas": "the scene's paper fills the frame edge to edge, with no dark mat and no outer torn border",
  "canvasColor": "#e9dcc5",
  "look": "full-bleed paper cut-out collage that fills the frame edge to edge (no dark mat, no outer torn-paper border, no floating sheet, no padding): every element is a separate cutout with a thick irregular white scissor / hand-cut border (magazine-photo edge), stacked with soft drop shadows; background pieces often high-contrast black-and-white or kraft while hero character and concept pieces stay full colour; visible paper grain and crumpled scraps inside the scene",
  "palette": "the scene paper reaches every edge; kraft and newsprint greys for background cutouts; saturated colour for hero pieces: tomato red, sky blue, sunflower yellow, leaf green, cream and charcoal",
  "typography": "letters cut individually from dark or coloured paper and glued slightly askew inside white-bordered strips, bold uppercase, each letter casting a tiny shadow",
  "motion": "stop-motion paste feel: cutouts slide in on flat planes, flip and stack, slight jitter between frames, shadows move with the pieces; pieces stay rigid and never morph or melt",
  "negatives": "dark outer mat, torn sheet border, letterbox padding, floating paper on a black field, missing white scissor borders, smooth vector shading, photorealistic 3D rooms, gradients, glossy 3D, digital caption fonts, morphing dissolve transitions",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is torn dark-ink paper lettering, layered on the kraft canvas, slightly offset layers.",
  "letteringLine2": "When line 2 exists, cut it from a sunflower-yellow paper strip with a torn edge and a thin dark outline.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/paper-cutout-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/paper-cutout",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

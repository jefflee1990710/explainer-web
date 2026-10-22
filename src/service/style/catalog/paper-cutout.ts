import type { IStyle } from "@/model/style";

// Hardcoded style definition for "paper-cutout".
export const paperCutoutStyle: IStyle = {
  "id": "paper-cutout",
  "name": "Paper cut-out",
  "description": "層疊色紙、手撕邊緣與微陰影的停格質感。",
  "canvas": "kraft-toned textured paper backdrop",
  "canvasColor": "#e9dcc5",
  "look": "layered paper cut-out collage: every element is a flat piece of coloured construction paper with slightly torn or scissor-cut edges, stacked with small soft drop shadows to show depth; visible paper grain, no outlines",
  "palette": "kraft paper background with saturated construction-paper colours: tomato red, sky blue, sunflower yellow, leaf green, cream and charcoal",
  "typography": "letters cut individually from dark paper and glued slightly askew, bold uppercase, each letter casting a tiny shadow; labels sit on a torn paper strip in a contrasting colour",
  "motion": "stop-motion paper feel: pieces slide in on flat planes, flip and layer, slight jitter between frames, shadows move with the pieces",
  "negatives": "outlines, smooth vector shading, photorealistic people, gradients, glossy 3D, digital fonts",
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

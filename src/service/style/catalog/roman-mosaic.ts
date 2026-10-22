import type { IStyle } from "@/model/style";

// Hardcoded style definition for "roman-mosaic".
export const romanMosaicStyle: IStyle = {
  "id": "roman-mosaic",
  "name": "Roman mosaic",
  "description": "小石磚拼出的人物、邊框與銘文。",
  "canvas": "a wall of small square tesserae with a decorative mosaic border",
  "canvasColor": "#7a1f2b",
  "look": "Roman mosaic: every shape built from visible square tiles, hard edges, ornamental border, no brush strokes",
  "palette": "deep red, cream, black, gold, and a little sea blue",
  "typography": "tile-built Roman capitals, one short line, as if set in stone",
  "motion": "tiles pop into place to form the figure; the border is already complete",
  "negatives": "smooth paint, photoreal skin, chalk, watercolor, 3D gloss, vector gradients",
  "letteringLayout": "One short line in tile-built Roman capitals, lower third, clear of the subject.",
  "letteringLine1": "tile-built Roman capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in tile-built Roman capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/roman-mosaic-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/roman-mosaic",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

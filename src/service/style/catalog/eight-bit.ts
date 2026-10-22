import type { IStyle } from "@/model/style";

// Hardcoded style definition for "eight-bit".
export const eightBitStyle: IStyle = {
  "id": "eight-bit",
  "name": "8-bit",
  "description": "8-bit 遊戲畫面：大方塊、有限色與像素字。",
  "canvas": "a chunky pixel scene with a limited console palette",
  "canvasColor": "#241b4a",
  "look": "8-bit pixel art: large visible square pixels, no anti-aliasing, limited colours per sprite, side-view game scene",
  "palette": "a small set of navy, red, cream, leaf green, and gold",
  "typography": "pixel-font capitals, one short line, aligned to the pixel grid",
  "motion": "sprites step in whole pixels; no smooth blur, no sub-pixel motion",
  "negatives": "anti-aliased vectors, photoreal, paint strokes, high-resolution detail, 3D gloss, watercolor",
  "letteringLayout": "One short line in pixel-font capitals, lower third, clear of the subject.",
  "letteringLine1": "pixel-font capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in pixel-font capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/eight-bit-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/eight-bit",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

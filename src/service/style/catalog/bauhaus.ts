import type { IStyle } from "@/model/style";

// Hardcoded style definition for "bauhaus".
export const bauhausStyle: IStyle = {
  "id": "bauhaus",
  "name": "Bauhaus",
  "description": "包浩斯：原色、幾何、網格與無襯線。",
  "canvas": "off-white poster with a strict grid and primary-colour blocks",
  "canvasColor": "#f4f1ea",
  "look": "Bauhaus graphic design: circles, squares, and bars, asymmetric balance, no texture",
  "palette": "red, yellow, blue, black, and off-white",
  "typography": "bold geometric sans, aligned to the grid, short",
  "motion": "shapes snap to the grid, slide on rails, and scale; no organic wobble",
  "negatives": "painterly strokes, photoreal, pixels, decoration, script fonts, chalk, clay",
  "letteringLayout": "One short line in bold geometric sans, lower third, clear of the subject.",
  "letteringLine1": "bold geometric sans, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in bold geometric sans near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/bauhaus-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/bauhaus",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

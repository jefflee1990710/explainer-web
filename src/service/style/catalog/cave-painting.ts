import type { IStyle } from "@/model/style";

// Hardcoded style definition for "cave-painting".
export const cavePaintingStyle: IStyle = {
  "id": "cave-painting",
  "name": "Cave painting",
  "description": "赭石岩壁上的手印、動物與簡筆人物。",
  "canvas": "rough ochre cave wall with soot stains and sprayed handprints",
  "canvasColor": "#c4a574",
  "look": "prehistoric cave painting: uneven mineral pigment, stick figures and animals in profile, no perspective",
  "palette": "ochre, charcoal, rust red, and bone white on a warm rock wall",
  "typography": "scratched charcoal capitals, short and uneven",
  "motion": "figures shuffle in profile; pigment blooms onto the rock; the wall stays fixed",
  "negatives": "photoreal faces, clean vector, perspective rooms, neon, pixels, glossy 3D",
  "letteringLayout": "One short line in scratched charcoal capitals, lower third, clear of the subject.",
  "letteringLine1": "scratched charcoal capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in scratched charcoal capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/cave-painting-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/cave-painting",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

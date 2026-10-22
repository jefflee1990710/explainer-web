import type { IStyle } from "@/model/style";

// Hardcoded style definition for "ray-traced".
export const rayTracedStyle: IStyle = {
  "id": "ray-traced",
  "name": "Ray-traced CGI",
  "description": "早期光線追蹤：金屬球、棋盤地與漸層天空。",
  "canvas": "a reflective studio with a checker floor and a gradient sky",
  "canvasColor": "#147a86",
  "look": "early ray-traced CGI: reflective spheres, checker floor, chrome highlights, smooth gradients, no brush marks",
  "palette": "teal, chrome silver, a hot pink accent, and a sunset gradient",
  "typography": "shiny beveled letters, short, sitting in the scene",
  "motion": "reflections slide as the camera trucks slowly; objects glide",
  "negatives": "paint, pixels, chalk, paper texture, flat vector, hand-drawn outlines, clay",
  "letteringLayout": "One short line in shiny beveled letters, lower third, clear of the subject.",
  "letteringLine1": "shiny beveled letters, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in shiny beveled letters near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ray-traced-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ray-traced",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

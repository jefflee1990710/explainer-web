import type { IStyle } from "@/model/style";

// Hardcoded style definition for "egyptian-wall".
export const egyptianWallStyle: IStyle = {
  "id": "egyptian-wall",
  "name": "Egyptian wall painting",
  "description": "莎草紙色底、側面人像與象形文字邊框。",
  "canvas": "flat papyrus-coloured wall with a band of hieroglyphs along the top",
  "canvasColor": "#e7d7a8",
  "look": "ancient Egyptian wall painting: composite profile view, flat colour, heavy outlines, figures on a ground line",
  "palette": "papyrus cream, turquoise, lapis blue, gold, and terracotta",
  "typography": "geometric block capitals, evenly spaced, like carved signs",
  "motion": "figures slide along the ground line; colour fills in flat bands",
  "negatives": "perspective, shading, photoreal skin, pixels, watercolor bloom, 3D render",
  "letteringLayout": "One short line in geometric block capitals, lower third, clear of the subject.",
  "letteringLine1": "geometric block capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in geometric block capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/egyptian-wall-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/egyptian-wall",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

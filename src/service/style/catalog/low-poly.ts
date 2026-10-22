import type { IStyle } from "@/model/style";

// Hardcoded style definition for "low-poly".
export const lowPolyStyle: IStyle = {
  "id": "low-poly",
  "name": "Low-poly 3D",
  "description": "低面數方塊、平面上色與柔陰影，遊戲世界感。",
  "canvas": "soft daylight 3D space with a simple ground plane and distant low buildings or trees",
  "canvasColor": "#d5e4ee",
  "look": "low-poly 3D: chunky flat-faced shapes, hard edges, soft ambient occlusion, no fine texture, like a stylised game world",
  "palette": "sky blue, warm gray, leaf green, clay orange, and cream; one accent colour for the hero object",
  "typography": "bold geometric sans, white or near-black, short labels floating as flat plaques in the world",
  "motion": "objects slide, pop, and assemble along simple paths; the camera dollies or trucks slowly; no motion blur smears",
  "negatives": "photoreal skin, high-poly detail, noisy textures, chalk, marker doodles, watercolor wash, pixel blocks",
  "letteringLayout": "One short line on a flat plaque in the lower third, clear of the hero object.",
  "letteringLine1": "Bold geometric sans, one line, high contrast against the plaque.",
  "letteringLine2": "A smaller second line under it in the same sans, only when a second line exists.",
  "beatTitleLayout": "A short title plaque near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/low-poly-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/low-poly",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

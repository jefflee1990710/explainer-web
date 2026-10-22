import type { IStyle } from "@/model/style";

// Hardcoded style definition for "flat-vector".
export const flatVectorStyle: IStyle = {
  "id": "flat-vector",
  "name": "Flat vector",
  "description": "無外框幾何造型、企業風配色，乾淨俐落。",
  "canvas": "flat solid off-white canvas",
  "canvasColor": "#f6f4ee",
  "look": "clean flat vector illustration with no outlines: simple geometric shapes, soft rounded corners, characters with slightly elongated limbs, flat colour blocks with at most one darker tone for depth, no gradients, no textures",
  "palette": "off-white canvas with a confident corporate palette: deep indigo, coral, mustard, teal and a warm range of skin tones; one accent colour per scene",
  "typography": "clean geometric sans-serif labels in title case, medium weight, set in deep indigo or the scene accent colour; labels sit in soft rounded pill shapes or float with generous spacing; never handwriting",
  "motion": "smooth eased motion: shapes slide and scale with gentle overshoot, elements assemble from simple geometric parts, subtle parallax",
  "negatives": "outlines, hand-drawn wobble, photorealism, 3D shading, gradients, textures, heavy drop shadows",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is clean geometric all-caps vector type in dark ink, even stroke, no serifs.",
  "letteringLine2": "When line 2 exists, draw it as the same vector type inside a flat warm-yellow rounded rectangle. No drop shadow.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/flat-vector-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/flat-vector",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

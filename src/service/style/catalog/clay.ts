import type { IStyle } from "@/model/style";

// Hardcoded style definition for "clay".
export const clayStyle: IStyle = {
  "id": "clay",
  "name": "Claymation",
  "description": "手捏黏土、柔光攝影棚的停格動畫。",
  "canvas": "soft studio backdrop in a single pastel colour",
  "canvasColor": "#efe6f5",
  "look": "stop-motion claymation: chunky hand-sculpted plasticine characters and props with visible fingerprints and slight lumpiness, soft studio lighting, shallow depth of field, matte surfaces",
  "palette": "pastel backdrop with bright plasticine colours: coral, sunshine yellow, mint, sky blue and warm terracotta skin tones",
  "typography": "words sculpted from clay in rounded bold letters standing upright on the set with soft shadows; labels are small clay plaques with pressed-in letters; never flat graphic text",
  "motion": "stop-motion cadence: squash and stretch, objects morph by reshaping the clay, slight hand-animated jitter",
  "negatives": "flat 2D drawing, outlines, glossy CGI plastic, photorealistic humans, painted-on gradients, printed fonts",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is raised dark clay all-caps letters, soft 3D edges, stop-motion scale.",
  "letteringLine2": "When line 2 exists, press it into a warm-yellow clay slab with a dark clay outline.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/clay-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/clay",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

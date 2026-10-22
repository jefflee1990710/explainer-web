import type { IStyle } from "@/model/style";

// Hardcoded style definition for "watercolor".
export const watercolorStyle: IStyle = {
  "id": "watercolor",
  "name": "Watercolour storybook",
  "description": "柔和暈染、鉛筆線稿的繪本氛圍。",
  "canvas": "warm cream cold-pressed watercolour paper with visible grain",
  "canvasColor": "#fbf6ea",
  "look": "storybook watercolour: loose translucent washes with soft bleeding edges and granulation, fine pencil or sepia ink line work underneath, white paper left showing as highlights",
  "palette": "cream paper with soft washes: dusty rose, sage green, ochre, muted cobalt and warm gray; colours stay light and airy",
  "typography": "gentle hand-lettered sepia ink in mixed case like a picture-book caption, sitting on a light wash blob or plain paper; never bold blocky text",
  "motion": "washes bloom outward, ink lines draw on softly, elements fade and drift like turning pages",
  "negatives": "hard vector edges, black marker outlines, photorealism, neon colours, 3D rendering, heavy shadows",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is wet brush all-caps in dark pigment, soft edges, readable on the wash.",
  "letteringLine2": "When line 2 exists, paint it on a warm-yellow watercolor wash with a darker brush outline.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/watercolor-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/watercolor",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

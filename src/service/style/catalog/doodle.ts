import type { IStyle } from "@/model/style";

// Hardcoded style definition for "doodle".
export const doodleStyle: IStyle = {
  "id": "doodle",
  "name": "Whiteboard doodle",
  "description": "黑色馬克筆線條、扁平上色，白板解說感。",
  "canvas": "clean solid white canvas, as if sketched with a digital marker",
  "canvasColor": "#ffffff",
  "look": "2D hand-drawn cartoon: bold black outlines with slightly irregular organic stroke weight, lines never perfectly straight; flat marker-style colour fills sitting slightly inside the outlines and a little scribbled; almost no shading",
  "palette": "white canvas, black ink, light blue, warm yellow, brown, green and gray; warm yellow for tags and highlights, green for arrows and positive tags, brown for cardboard boxes, gray for neutral props",
  "typography": "short handwritten all-caps marker labels in black with the same stroke weight as the outlines and a slightly wobbly baseline; tags are warm-yellow rounded rectangles with a black outline; never printed fonts, never subtitles or captions",
  "motion": "marker-doodle animation: objects pop, morph and slide with snappy hand-drawn timing; arrows draw themselves on; icons snap into place",
  "negatives": "photorealism, 3D rendering, painterly shading, gradients, chalkboard inversion, polished outline-free vector art, perfect CAD geometry, watermarks",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is bold black hand-drawn all-caps marker, same stroke weight as the outlines, slightly wobbly baseline.",
  "letteringLine2": "When line 2 exists, draw it as bold all-caps inside a warm-yellow rounded highlight box with a black outline. No printed font.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/doodle-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/doodle",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

import type { IStyle } from "@/model/style";

// Hardcoded style definition for "ink-manga".
export const inkMangaStyle: IStyle = {
  "id": "ink-manga",
  "name": "Ink manga",
  "description": "沾水筆線條、網點與速度線的漫畫張力。",
  "canvas": "white manga page with a panel-free composition",
  "canvasColor": "#ffffff",
  "look": "black-and-white manga ink drawing: confident variable-width brush inking, screentone dot patterns for mid-tones, dramatic speed lines and impact bursts, expressive exaggerated faces",
  "palette": "strictly black ink on white with gray screentone; a single spot colour of red allowed for one emphasis element per scene",
  "typography": "bold hand-inked sound-effect style lettering in black with white inner fill and thick outline, uppercase, slightly tilted; explanatory labels sit inside rounded speech-bubble shapes with a small tail",
  "motion": "manga panel energy: speed lines streak in, elements slam in with impact bursts, quick cuts, tone patterns shimmer",
  "negatives": "full colour fills, painterly shading, photorealism, 3D, soft gradients, printed body-text fonts, chibi marker doodle",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is bold ink-brush all-caps, heavy black strokes, manga speed.",
  "letteringLine2": "When line 2 exists, put it in a warm-yellow screentone box with a thick ink outline.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ink-manga-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ink-manga",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

import type { IStyle } from "@/model/style";

// Hardcoded style definition for "pop-art".
export const popArtStyle: IStyle = {
  "id": "pop-art",
  "name": "Pop art",
  "description": "普普藝術：網點、粗黑邊與高彩平塗。",
  "canvas": "a flat comic field of Ben-Day dots",
  "canvasColor": "#f2d63b",
  "look": "Pop art: thick black outlines, flat unmodulated colour, Ben-Day dots, comic close-up energy",
  "palette": "cyan, magenta, yellow, black, and white",
  "typography": "bold comic display letters in a yellow box, all caps, one short line",
  "motion": "panels slam in; dots stamp on; colour holds flat",
  "negatives": "painterly realism, soft watercolor, chalk, 3D render, muted palette, thin lines",
  "letteringLayout": "One short line in bold comic capitals, lower third, clear of the subject.",
  "letteringLine1": "bold comic capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in bold comic capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/pop-art-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/pop-art",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

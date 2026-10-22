import type { IStyle } from "@/model/style";

// Hardcoded style definition for "cream-poster".
export const creamPosterStyle: IStyle = {
  "id": "cream-poster",
  "name": "Cream editorial poster",
  "description": "奶油紙底、超大黑字與鏽橙重點，下面一排線稿圖示卡。",
  "canvas": "warm cream paper, flat, with a wide empty margin",
  "canvasColor": "#f6efe6",
  "look": "editorial social poster on cream paper. Giant black display type fills the upper half. One word is rust-orange italic serif. Along the bottom, a row of rounded cream cards holds rust line icons: a person pointing, and a light bulb. The bulb card is labeled IDEA. Small tracked caps sit above the headline with a rust dot. No photographed people.",
  "palette": "cream paper, near-black ink, and one rust-orange accent",
  "typography": "huge high-contrast display sans, with a single rust italic serif word",
  "motion": "icon cards slide in from the right; the accent word fades up; the paper stays still",
  "negatives": "photoreal faces, clay, chalk, watercolor, pixels, comic halftone, dark background, app chrome, like buttons",
  "letteringLayout": "IDEA is the giant black headline in the upper half, clear of the icon cards.",
  "letteringLine1": "Huge black display sans, one line, reading IDEA.",
  "letteringLine2": "A smaller tracked sans line under the headline when a second line exists.",
  "beatTitleLayout": "A short cream-poster headline, not a caption bar.",
  "reelLayout": "Keep the headline and icon row inside the center, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/cream-poster-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/cream-poster",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

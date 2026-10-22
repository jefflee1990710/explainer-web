import type { IStyle } from "@/model/style";

// Hardcoded style definition for "proof-poster".
export const proofPosterStyle: IStyle = {
  "id": "proof-poster",
  "name": "Dark proof poster",
  "description": "黑底、撕邊數據圖與超大白色標題。",
  "canvas": "a solid black field",
  "canvasColor": "#111111",
  "look": "dark proof poster. A torn-paper plate holds a simple light chart. A huge white grotesque headline fills the lower half and reads IDEA. Two thin white line icons, a pointing person and a bulb, sit beside the plate. No 3D volumes and no science diagram.",
  "palette": "black, white, and one violet accent on the chart",
  "typography": "extra-bold grotesque sans, white, tight leading",
  "motion": "the torn plate slides in; the headline snaps on; the black field stays still",
  "negatives": "navy science diagram, glowing 3D volumes, chalk, clay, watercolor, cute mascot, daylight scene",
  "letteringLayout": "IDEA is the huge white headline in the lower half, clear of the torn chart.",
  "letteringLine1": "Extra-bold white grotesque sans, one line, reading IDEA.",
  "letteringLine2": "A smaller white line under the headline when a second line exists.",
  "beatTitleLayout": "A short white poster headline, not a thin diagram label.",
  "reelLayout": "Headline and torn plate stay inside the frame, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/proof-poster-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/proof-poster",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

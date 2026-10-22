import type { IStyle } from "@/model/style";

// Hardcoded style definition for "data-ring".
export const dataRingStyle: IStyle = {
  "id": "data-ring",
  "name": "Data ring",
  "description": "深色同心圓、一圈數字，中央一道半透明大字。",
  "canvas": "a near-black field of faint concentric circles",
  "canvasColor": "#140e0c",
  "look": "flat kinetic data mandala. White and rust digits sit on concentric rings. One huge translucent condensed phrase crosses the center and reads IDEA. No solid character and no 3D object; a tiny tick mark can stand where a person would point.",
  "palette": "near-black, warm white, rust orange, and muted gray",
  "typography": "condensed sans for the giant center phrase, tabular digits on the rings",
  "motion": "rings rotate slowly in opposite directions; digits tick; the center phrase stays locked",
  "negatives": "cute character, daylight, clay, chalk, watercolor, photoreal faces, science 3D volumes, game city",
  "letteringLayout": "IDEA is the huge translucent phrase across the center of the rings.",
  "letteringLine1": "Condensed sans, one line, warm white, reading IDEA.",
  "letteringLine2": "A smaller muted line under the phrase when a second line exists.",
  "beatTitleLayout": "The center phrase is the title, not a caption bar.",
  "reelLayout": "The phrase stays inside the rings, clear of the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/data-ring-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/data-ring",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

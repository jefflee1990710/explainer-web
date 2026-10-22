import type { IStyle } from "@/model/style";

// Hardcoded style definition for "gothic-illumination".
export const gothicIlluminationStyle: IStyle = {
  "id": "gothic-illumination",
  "name": "Gothic illumination",
  "description": "金箔底、花邊框與手抄本裝飾首字。",
  "canvas": "gold-leaf manuscript page with a painted vine border",
  "canvasColor": "#c6a15b",
  "look": "Gothic illuminated manuscript: flat gold ground, jewel colours, patterned robes, a large decorated initial",
  "palette": "gold, ultramarine, vermilion, and parchment cream",
  "typography": "blackletter title with one decorated initial, short and readable",
  "motion": "the initial draws itself, gold fills the ground, figures settle into the frame",
  "negatives": "photoreal, pixels, modern sans, chalkboard, 3D, impressionist brushwork",
  "letteringLayout": "One short line in blackletter, lower third, clear of the subject.",
  "letteringLine1": "blackletter, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in blackletter near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/gothic-illumination-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/gothic-illumination",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

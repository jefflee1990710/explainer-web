import type { IStyle } from "@/model/style";

// Hardcoded style definition for "ukiyo-e".
export const ukiyoEStyle: IStyle = {
  "id": "ukiyo-e",
  "name": "Ukiyo-e",
  "description": "浮世繪木版畫：平塗色塊、黑線與和紙。",
  "canvas": "warm washi paper with a thin black keyline border",
  "canvasColor": "#f3e6c4",
  "look": "Japanese ukiyo-e woodblock print: flat colour areas, crisp black keylines, patterned textiles, a distant landscape motif",
  "palette": "indigo, vermilion, ochre, black, and paper cream",
  "typography": "bold woodblock-printed capitals, black on the paper, short",
  "motion": "colour blocks stamp in one after another; figures slide in profile",
  "negatives": "photoreal, oil impasto, pixels, 3D, chalk, watercolor bloom, Western shading",
  "letteringLayout": "One short line in woodblock-printed capitals, lower third, clear of the subject.",
  "letteringLine1": "woodblock-printed capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in woodblock-printed capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ukiyo-e-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/ukiyo-e",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

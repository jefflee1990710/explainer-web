import type { IStyle } from "@/model/style";

// Hardcoded style definition for "high-renaissance".
export const highRenaissanceStyle: IStyle = {
  "id": "high-renaissance",
  "name": "High Renaissance",
  "description": "柔和光影、透視窗景與靜物的古典油畫。",
  "canvas": "a quiet interior with a window, tiled floor, and warm directional light",
  "canvasColor": "#6e5848",
  "look": "High Renaissance oil painting: soft chiaroscuro, accurate perspective, calm posed figures, glazed colour, no cartoon outlines",
  "palette": "warm brown, deep green, wine red, and pale sky through the window",
  "typography": "small classical serif capitals, restrained, like an inscription",
  "motion": "light shifts slowly; figures barely move; the camera holds",
  "negatives": "flat vector, pixels, thick outlines, neon, chalkboard, clay, manga speed lines",
  "letteringLayout": "One short line in classical serif capitals, lower third, clear of the subject.",
  "letteringLine1": "classical serif capitals, one line, high contrast.",
  "letteringLine2": "A smaller second line in the same hand when a second line exists.",
  "beatTitleLayout": "A short title in classical serif capitals near the subject, not a paragraph.",
  "reelLayout": "Keep type inside the center safe area, away from the top and bottom edges.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/high-renaissance-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/high-renaissance",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

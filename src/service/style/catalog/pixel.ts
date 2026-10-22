import type { IStyle } from "@/model/style";

// Hardcoded style definition for "pixel".
export const pixelStyle: IStyle = {
  "id": "pixel",
  "name": "Pixel art",
  "description": "16-bit 方塊像素、復古遊戲機調色。",
  "canvas": "flat dark navy background with a subtle pixel grid",
  "canvasColor": "#1e2340",
  "look": "16-bit pixel art: crisp square pixels with no anti-aliasing, limited palette, chunky one-pixel dark outlines, simple dithering for shading, characters roughly forty-eight pixels tall",
  "palette": "dark navy background with a retro console palette: bright cyan, magenta, lime, gold, white and a few skin tones",
  "typography": "blocky monospaced pixel font in white or gold, uppercase, with a one-pixel dark drop shadow; labels sit in simple pixel boxes like a game HUD",
  "motion": "sprite animation: frame-stepped movement, objects blink and slide in whole-pixel steps, flashing highlights, screen-shake on impacts",
  "negatives": "smooth curves, anti-aliasing, gradients, photorealism, hand-drawn lines, blurry edges, vector shapes",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is chunky pixel all-caps, 1-bit dark pixels, no anti-alias.",
  "letteringLine2": "When line 2 exists, draw it as the same pixel type on a warm-yellow pixel block. No printed font.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/pixel-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/pixel",
  "behavior": {
    "realistic": false,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};

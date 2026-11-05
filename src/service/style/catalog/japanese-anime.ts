import type { IStyle } from "@/model/style";

// Hardcoded style definition for "japanese-anime".
export const japaneseAnimeStyle: IStyle = {
  id: "japanese-anime",
  name: "Japanese anime",
  description: "新海誠式劇院級日本動畫：細膩賽璐珞角色線條、星光眼神與唯美夜空光影。",
  canvas:
    "luminous theatrical Japanese anime background with a deep twilight sky, starry cosmos or sunlit clouds, and rich atmospheric depth",
  canvasColor: "#0e1b38",
  look: "Japanese theatrical 2D anime film illustration (Makoto Shinkai cinematic anime aesthetic): clean delicate hand-drawn cel-animation line art, soft cel-shaded skin with gentle warm blush and luminous moonlight or sunset rim highlights, expressive anime eyes with sparkling starlight catchlights, flowing hair with subtle glowing stardust light particles, and richly painted atmospheric background scenery",
  palette:
    "deep midnight indigo, twilight cobalt, luminous starlight white and cyan sparkles, soft moonlight cream, warm peach skin tones, and crisp cel-shaded wardrobe colours",
  typography:
    "clean high-contrast cinematic anime title serif or sleek modern sans in pure white with a subtle luminous glow, sitting cleanly in the upper sky area",
  motion:
    "2D theatrical anime motion: hair and fabric sway gently in the breeze, stardust light particles drift upward, expressive eye blinks and smooth camera pan across the painted sky",
  negatives:
    "photoreal human skin pores, Western comic book heavy ink hatching, chibi marker doodle, 3D clay, pixel blocks, flat corporate clip-art, chalkboard, paper cutout",
  letteringLayout:
    "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  letteringLine1:
    "Line 1 is luminous white theatrical anime display capitals with a subtle starlight glow.",
  letteringLine2:
    "When line 2 exists, set it in crisp pale-cyan or warm-cream anime subtitle type below line 1.",
  beatTitleLayout:
    "Place a named beat title in the title safe zone near 22%–26% of the frame height against the painted sky.",
  reelLayout:
    "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/japanese-anime-preview.webp",
  previewFullUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/japanese-anime.webp",
  behavior: {
    realistic: false,
    usesDrawingSurface: false,
    monochromeChalk: false,
  },
};

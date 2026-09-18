import sharp from "sharp";

// GPT Image sometimes returns RGBA with a transparent "canvas". Frames must be
// opaque so they read the same everywhere; fill with the style's canvas colour.
export async function flattenToCanvas(buffer: Buffer, canvasHex: string) {
  const meta = await sharp(buffer).metadata();
  if (!meta.hasAlpha) return buffer;
  return sharp(buffer).flatten({ background: canvasHex }).png().toBuffer();
}

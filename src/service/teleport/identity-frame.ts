import sharp from "sharp";

/** Keep person pixels and paint every other pixel #f2f2f2. `mask` is row-major, 1 = person. */
export async function cutSubjectOntoPlain(
  frame: Buffer,
  mask: Uint8Array,
  width: number,
  height: number,
): Promise<Buffer> {
  if (mask.length !== width * height) {
    throw new Error("身份遮罩尺寸與畫格不符");
  }
  // Decode to raw RGBA at the mask size so each pixel lines up with one mask value.
  const { data } = await sharp(frame)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) continue;
    const o = i * 4;
    data[o] = 242;
    data[o + 1] = 242;
    data[o + 2] = 242;
    data[o + 3] = 255;
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
    // Lossless: lossy WebP chroma subsampling bleeds grey into the person's edge pixels.
    .webp({ lossless: true })
    .toBuffer();
}

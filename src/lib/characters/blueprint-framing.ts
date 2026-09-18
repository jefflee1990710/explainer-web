import sharp from "sharp";

const WHITE_THRESHOLD = 242;
const DEFAULT_MARGIN_RATIO = 0.12;

export function isNearWhite(r: number, g: number, b: number) {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

export type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

// Bounding box of every non-white pixel in a raw RGBA buffer.
export function findContentBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): ContentBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isNearWhite(data[i], data[i + 1], data[i + 2])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

// Shrink the detected sheet content onto a white canvas with fixed margins.
export async function reframeBlueprintBuffer(
  input: Buffer,
  marginRatio = DEFAULT_MARGIN_RATIO,
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) return input;

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = findContentBounds(data, info.width, info.height, info.channels);
  if (!bounds) return input;

  const marginX = Math.round(width * marginRatio);
  const marginY = Math.round(height * marginRatio);
  const innerW = width - marginX * 2;
  const innerH = height - marginY * 2;

  const pad = Math.round(Math.min(width, height) * 0.015);
  const extractLeft = Math.max(0, bounds.minX - pad);
  const extractTop = Math.max(0, bounds.minY - pad);
  const extractRight = Math.min(width - 1, bounds.maxX + pad);
  const extractBottom = Math.min(height - 1, bounds.maxY + pad);
  const extractW = extractRight - extractLeft + 1;
  const extractH = extractBottom - extractTop + 1;

  const scale = Math.min(innerW / extractW, innerH / extractH);
  const targetW = Math.max(1, Math.round(extractW * scale));
  const targetH = Math.max(1, Math.round(extractH * scale));
  const offsetX = marginX + Math.round((innerW - targetW) / 2);
  const offsetY = marginY + Math.round((innerH - targetH) / 2);

  const content = await sharp(input)
    .extract({ left: extractLeft, top: extractTop, width: extractW, height: extractH })
    .resize(targetW, targetH, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: content, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();
}

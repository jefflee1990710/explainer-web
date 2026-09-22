import sharp from "sharp";

// Per-channel distance from the canvas colour that still counts as
// background (the old white-only threshold was 242, i.e. 255 - 13).
const CANVAS_TOLERANCE = 255 - 242;
const DEFAULT_MARGIN_RATIO = 0.12;

export type Rgb = { r: number; g: number; b: number };

const HEX6 = /^#?[0-9a-f]{6}$/i;

// "#rrggbb" -> channel values. Only strict 6-digit hex is accepted.
export function hexToRgb(hex: string): Rgb {
  if (!HEX6.test(hex)) {
    throw new Error(`invalid canvas colour, expected #rrggbb: ${hex}`);
  }
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

// The reframe safety-net only works when the model reliably paints the canvas
// as near-white solid pixels. Textured or dark canvases (chalkboard, paper,
// watercolor) never land within tolerance of their hex, so the whole sheet
// would read as content; for those we trust the prompt's margin rules.
export function canReframeOnCanvas(canvasHex: string): boolean {
  const { r, g, b } = hexToRgb(canvasHex);
  return isNearCanvas(r, g, b, { r: 255, g: 255, b: 255 });
}

// True when the pixel is within tolerance of the canvas colour on every channel.
export function isNearCanvas(r: number, g: number, b: number, canvas: Rgb) {
  return (
    Math.abs(r - canvas.r) <= CANVAS_TOLERANCE &&
    Math.abs(g - canvas.g) <= CANVAS_TOLERANCE &&
    Math.abs(b - canvas.b) <= CANVAS_TOLERANCE
  );
}

export type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

// Bounding box of every pixel that is not the canvas colour in a raw buffer.
export function findContentBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  canvas: Rgb,
): ContentBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isNearCanvas(data[i], data[i + 1], data[i + 2], canvas)) {
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

// Shrink the detected sheet content onto the style's canvas colour with fixed
// margins. `canvasHex` must match the background the blueprint prompt asked
// for, otherwise the whole sheet reads as content.
export async function reframeBlueprintBuffer(
  input: Buffer,
  canvasHex: string,
  marginRatio = DEFAULT_MARGIN_RATIO,
): Promise<Buffer> {
  const canvas = hexToRgb(canvasHex);
  const meta = await sharp(input).metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) return input;

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = findContentBounds(data, info.width, info.height, info.channels, canvas);
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
      background: canvas,
    },
  })
    .composite([{ input: content, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();
}

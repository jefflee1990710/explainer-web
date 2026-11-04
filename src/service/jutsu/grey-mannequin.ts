import sharp from "sharp";

/** SAM 3.1 working size in Openjutsu (`ImageScaleToMaxDimension` largest_size 1008). */
export const JUTSU_SAM_LONG_EDGE = 1008;

/**
 * `H3GreyMannequins` blur, as a share of the person's height.
 * Workflows set `0.04`; the node clamps the resulting sigma between 1 px and 8 px.
 */
export const JUTSU_MANNEQUIN_BLUR = 0.04;

/** Mannequin mask hold (`H3PeopleMask` headroom 0). Covers this many frames before and after. */
export const JUTSU_MANNEQUIN_HOLD_FRAMES = 1;

/** Edit-mask hold (`H3PeopleMask` headroom 0.1) so a quick dip does not shrink the regenerated area. */
export const JUTSU_EDIT_HOLD_FRAMES = 2;

/** Extra mask above the head, as a share of the person's height. */
export const JUTSU_EDIT_HEADROOM = 0.1;

const SHARP_BLUR = 1;
const SOFT_BLUR = 8;

export type OpenJutsuMaskMode = "subject" | "background";

/** True when any pixel is foreground. */
export function maskHasForeground(mask: Uint8Array): boolean {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) return true;
  }
  return false;
}

/**
 * Temporal max-pool from `H3PeopleMask.person_mask`.
 * `holdFrames` is how many frames before and after also count (kernel `2 * hold + 1`).
 */
export function holdMasksOverTime(
  masks: readonly Uint8Array[],
  holdFrames: number,
): Uint8Array[] {
  if (masks.length === 0) return [];
  if (holdFrames <= 0) return masks.map((mask) => Uint8Array.from(mask));
  const length = masks[0]!.length;
  const out: Uint8Array[] = [];
  for (let i = 0; i < masks.length; i++) {
    const dest = new Uint8Array(length);
    const from = Math.max(0, i - holdFrames);
    const to = Math.min(masks.length - 1, i + holdFrames);
    for (let t = from; t <= to; t++) {
      const src = masks[t]!;
      for (let p = 0; p < length; p++) {
        if (src[p]) dest[p] = 1;
      }
    }
    out.push(dest);
  }
  return out;
}

/**
 * Headroom only above columns near the person's highest point (the head), plus a per-pixel
 * height share for `H3GreyMannequins` blur. Height is measured before the headroom is added.
 */
export function applyPeopleMask(
  mask: Uint8Array,
  width: number,
  height: number,
  headroom: number,
): { mask: Uint8Array; size: Float32Array } {
  const out = Uint8Array.from(mask);
  const size = new Float32Array(width * height);
  if (width <= 0 || height <= 0 || mask.length < width * height) {
    return { mask: out, size };
  }

  let minRow = height;
  let maxRow = -1;
  const colTop = new Int32Array(width).fill(height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      if (y < minRow) minRow = y;
      if (y > maxRow) maxRow = y;
      if (y < colTop[x]!) colTop[x] = y;
    }
  }
  if (maxRow < 0) return { mask: out, size };

  const personHeight = maxRow - minRow + 1;
  const share = personHeight / height;
  const room = Math.round(personHeight * Math.max(0, headroom));
  let globalTop = height;
  for (let x = 0; x < width; x++) {
    if (colTop[x]! < globalTop) globalTop = colTop[x]!;
  }
  if (room > 0) {
    for (let x = 0; x < width; x++) {
      const top = colTop[x]!;
      if (top >= height || top > globalTop + room) continue;
      const y0 = Math.max(0, top - room);
      for (let y = y0; y < top; y++) out[y * width + x] = 1;
    }
  }
  for (let i = 0; i < width * height; i++) {
    if (out[i]) size[i] = share;
  }
  return { mask: out, size };
}

/** Fill enclosed holes. Openjutsu `GrowMaskWithBlur` uses `fill_holes: true` on the edit mask. */
export function fillMaskHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = Uint8Array.from(mask);
  if (width <= 0 || height <= 0) return out;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index] || out[index]) return;
    seen[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length > 0) {
    const index = stack.pop()!;
    const x = index % width;
    const y = (index - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  for (let i = 0; i < out.length; i++) {
    if (!seen[i]) out[i] = 1;
  }
  return out;
}

/**
 * Cross-kernel dilation (`GrowMaskWithBlur` with `tapered_corners: true`).
 * A pixel turns on when its Manhattan distance to a foreground pixel is at most `radius`.
 */
export function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0 || width <= 0 || height <= 0) return Uint8Array.from(mask);
  const inf = radius + 2;
  const dist = new Int32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = mask[i] ? 0 : inf;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let d = dist[i]!;
      if (x > 0) d = Math.min(d, dist[i - 1]! + 1);
      if (y > 0) d = Math.min(d, dist[i - width]! + 1);
      dist[i] = d;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let d = dist[i]!;
      if (x + 1 < width) d = Math.min(d, dist[i + 1]! + 1);
      if (y + 1 < height) d = Math.min(d, dist[i + width]! + 1);
      dist[i] = d;
    }
  }
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) {
    if (dist[i]! <= radius) out[i] = 1;
  }
  return out;
}

/** Invert a binary mask (`GrowMaskWithBlur` `flip_input`). Empty input stays empty. */
export function invertMask(mask: Uint8Array): Uint8Array {
  if (!maskHasForeground(mask)) return new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] ? 0 : 1;
  return out;
}

/** Light-grey byte from a 0..1 luma, matching `0.45 + 0.45 * luma` in `H3GreyMannequins`. */
export function openJutsuGreyByte(luma01: number): number {
  const clamped = Math.min(1, Math.max(0, luma01));
  return Math.round((0.45 + 0.45 * clamped) * 255);
}

/** Expand radius at the current canvas, scaled from the 1008 px SAM canvas. */
export function mannequinExpandPixels(
  marginPixelsAtSam: number,
  width: number,
  height: number,
): number {
  const longEdge = Math.max(width, height);
  if (longEdge <= 0) return 0;
  return Math.max(0, Math.round((marginPixelsAtSam * longEdge) / JUTSU_SAM_LONG_EDGE));
}

async function blurLumaPlane(
  luma: Uint8Array,
  width: number,
  height: number,
  sigma: number,
): Promise<Uint8Array> {
  const { data } = await sharp(Buffer.from(luma), {
    raw: { width, height, channels: 1 },
  })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * One frame of `H3GreyMannequins` plus the cyan/orange check-mask stitch.
 * Grey is `0.45 + 0.45 * blurredLuma`, blended only where `greyMask` is set.
 */
export async function paintOpenJutsuMannequinFrame(input: {
  frameBuffer: Buffer;
  greyMask: Uint8Array;
  size: Float32Array;
  editMask: Uint8Array;
  trackedMask: Uint8Array;
  blur?: number;
}): Promise<{ mannequinJpeg: Buffer; checkMaskJpeg: Buffer }> {
  const { data, info } = await sharp(input.frameBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixelCount = width * height;
  if (input.greyMask.length < pixelCount || input.editMask.length < pixelCount) {
    throw new Error("SAM mask size does not match frame dimensions");
  }

  const luma = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * channels;
    luma[i] = Math.round(0.299 * data[o]! + 0.587 * data[o + 1]! + 0.114 * data[o + 2]!);
  }
  const blur = input.blur ?? JUTSU_MANNEQUIN_BLUR;
  const [lumaSharp, lumaSoft] = await Promise.all([
    blurLumaPlane(luma, width, height, SHARP_BLUR),
    blurLumaPlane(luma, width, height, SOFT_BLUR),
  ]);

  const mannequinBuf = Buffer.from(data);
  const maskPreviewBuf = Buffer.from(data);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * channels;
    const r = data[o]!;
    const g = data[o + 1]!;
    const b = data[o + 2]!;
    if (input.greyMask[i]) {
      const heightPx = (input.size[i] || 0) * height;
      const soft = Math.min(1, Math.max(0, (heightPx * blur - SHARP_BLUR) / (SOFT_BLUR - SHARP_BLUR)));
      const mixed = lumaSharp[i]! * (1 - soft) + lumaSoft[i]! * soft;
      const greyVal = openJutsuGreyByte(mixed / 255);
      mannequinBuf[o] = greyVal;
      mannequinBuf[o + 1] = greyVal;
      mannequinBuf[o + 2] = greyVal;
    }
    // Cyan regenerated area first, then orange tracked subject on top (mask.api.json nodes 15 then 16).
    if (input.editMask[i]) {
      maskPreviewBuf[o] = Math.round(r * 0.55 + 0 * 0.45);
      maskPreviewBuf[o + 1] = Math.round(g * 0.55 + 200 * 0.45);
      maskPreviewBuf[o + 2] = Math.round(b * 0.55 + 255 * 0.45);
    }
    if (input.trackedMask[i]) {
      maskPreviewBuf[o] = Math.round(r * 0.65 + 255 * 0.35);
      maskPreviewBuf[o + 1] = Math.round(g * 0.65 + 140 * 0.35);
      maskPreviewBuf[o + 2] = Math.round(b * 0.65 + 0 * 0.35);
    }
  }

  const [mannequinJpeg, leftMaskPng, rightMannequinPng] = await Promise.all([
    sharp(mannequinBuf, { raw: { width, height, channels } }).jpeg({ quality: 86 }).toBuffer(),
    sharp(maskPreviewBuf, { raw: { width, height, channels } }).png().toBuffer(),
    sharp(mannequinBuf, { raw: { width, height, channels } }).png().toBuffer(),
  ]);

  const checkMaskJpeg = await sharp({
    create: {
      width: width * 2 + 4,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: leftMaskPng, left: 0, top: 0 },
      { input: rightMannequinPng, left: width + 4, top: 0 },
    ])
    .jpeg({ quality: 84 })
    .toBuffer();

  return { mannequinJpeg, checkMaskJpeg };
}

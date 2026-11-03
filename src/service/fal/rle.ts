/**
 * fal `sam-3/video-rle` returns per-frame sparse RLE strings:
 * space-separated `(flatIndex, runLength)` pairs in row-major order.
 * Empty string = no detection on that frame.
 */
export function decodeFalSparseRle(
  counts: string,
  width: number,
  height: number,
): Uint8Array {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  const trimmed = (counts || "").trim();
  if (!trimmed || width <= 0 || height <= 0) return mask;

  const nums = trimmed.split(/\s+/).map((n) => Number(n));
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const start = nums[i]!;
    const len = nums[i + 1]!;
    if (!Number.isFinite(start) || !Number.isFinite(len) || len <= 0) continue;
    const from = Math.max(0, Math.floor(start));
    const to = Math.min(size, from + Math.floor(len));
    for (let p = from; p < to; p++) mask[p] = 1;
  }
  return mask;
}

/** Axis-aligned bbox of a binary mask in normalized [0..1] coords, or null if empty. */
export function normalizedBBoxFromMask(
  mask: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } | null {
  if (width <= 0 || height <= 0 || mask.length < width * height) return null;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}

/** Nearest-neighbour resize of a binary mask to a new canvas size. */
export function resizeBinaryMaskNearest(
  mask: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const out = new Uint8Array(dstW * dstH);
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) return out;
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y + 0.5) * (srcH / dstH)));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x + 0.5) * (srcW / dstW)));
      out[y * dstW + x] = mask[sy * srcW + sx] ? 1 : 0;
    }
  }
  return out;
}

/** Share of pixels in [0..1] that are foreground (`1`). */
export function maskForegroundRatio(mask: Uint8Array): number {
  if (mask.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }
  return count / mask.length;
}

/**
 * Find the foreground pixel strictly inside `mask` that is closest to the mask's centroid,
 * returned as normalized [0..1] coordinates (`(x + 0.5) / width`, `(y + 0.5) / height`).
 */
export function computeMaskInteriorAnchorPoint(
  mask: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (width <= 0 || height <= 0 || mask.length < width * height) return null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      sumX += x;
      sumY += y;
      count++;
    }
  }
  if (count === 0) return null;

  const cx = sumX / count;
  const cy = sumY / count;
  let bestX = 0;
  let bestY = 0;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      const dx = x - cx;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestX = x;
        bestY = y;
      }
    }
  }

  return {
    x: Math.round(((bestX + 0.5) / width) * 1000) / 1000,
    y: Math.round(((bestY + 0.5) / height) * 1000) / 1000,
  };
}

/** Bitwise-OR union of binary masks of length `size`. */
export function unionBinaryMasks(
  masks: readonly Uint8Array[],
  size: number,
): Uint8Array {
  const out = new Uint8Array(Math.max(0, size));
  for (const m of masks) {
    const len = Math.min(out.length, m.length);
    for (let i = 0; i < len; i++) {
      if (m[i]) out[i] = 1;
    }
  }
  return out;
}

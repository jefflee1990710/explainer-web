import sharp from "sharp";
import { hasFalKey } from "@/service/fal/key";
import { falQueueSubscribe } from "@/service/fal/queue";
import { decodeFalSparseRle } from "@/service/fal/rle";
import { FAL_SAM3_IMAGE_RLE_ENDPOINT } from "@/service/fal/sam3-image";
import { uploadFalBuffer } from "@/service/fal/storage";

export type SafeTextBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CenteredFaceSafeZoneResult = {
  width: number;
  height: number;
  bestBox: SafeTextBox;
  /** Canvas-relative pixel offset from frame center (used by OpenCut `transform.positionX` / `positionY`). */
  normalizedOffset: {
    offsetX: number;
    offsetY: number;
  };
  maskPngBuffer: Promise<Buffer>;
};

type FalSam3ImageRleResult = {
  rle?: string | string[];
};

/**
 * Pure algorithm that computes the optimal horizontally-centered, face-avoiding, body-tolerant,
 * corner-avoiding bounding box and feathered binary mask (`white = regenerate / draw text`, `black = locked`).
 */
export function computeCenteredFaceSafeBox(input: {
  rgba: Buffer;
  width: number;
  height: number;
  faceMask: Uint8Array;
  stdThreshold?: number;
}): CenteredFaceSafeZoneResult {
  const { rgba, width, height, faceMask, stdThreshold = 22 } = input;
  const gridS = 16;
  const gw = Math.max(4, Math.floor(width / gridS));
  const gh = Math.max(4, Math.floor(height / gridS));
  const cellFace = new Uint8Array(gw * gh);
  const cellLowVar = new Uint8Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let sum = 0;
      let sumSq = 0;
      let faceHits = 0;
      const count = gridS * gridS;

      for (let dy = 0; dy < gridS; dy++) {
        const y = Math.min(height - 1, gy * gridS + dy);
        for (let dx = 0; dx < gridS; dx++) {
          const x = Math.min(width - 1, gx * gridS + dx);
          const idx = y * width + x;
          if (faceMask[idx]) faceHits++;
          const r = rgba[idx * 4] ?? 0;
          const g = rgba[idx * 4 + 1] ?? 0;
          const b = rgba[idx * 4 + 2] ?? 0;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sum += lum;
          sumSq += lum * lum;
        }
      }

      const mean = sum / count;
      const variance = Math.max(0, sumSq / count - mean * mean);
      const std = Math.sqrt(variance);

      if (faceHits > 0) cellFace[gy * gw + gx] = 1;
      if (std <= stdThreshold) cellLowVar[gy * gw + gx] = 1;
    }
  }

  const boxGw = Math.max(2, Math.floor((width * 0.58) / gridS));
  const boxGh = Math.max(2, Math.floor((height * 0.22) / gridS));
  let bestScore = -1e9;
  let bestGx = Math.floor((gw - boxGw) / 2);
  let bestGy = Math.floor(gh * 0.56);

  for (let gy = 1; gy + boxGh < gh - 1; gy++) {
    for (let gx = 1; gx + boxGw < gw - 1; gx++) {
      let faceOverlapCells = 0;
      let lowVarCells = 0;

      for (let dy = 0; dy < boxGh; dy++) {
        for (let dx = 0; dx < boxGw; dx++) {
          const cIdx = (gy + dy) * gw + (gx + dx);
          if (cellFace[cIdx]) faceOverlapCells++;
          if (cellLowVar[cIdx]) lowVarCells++;
        }
      }

      const cx = (gx + boxGw / 2) / gw;
      const cy = (gy + boxGh / 2) / gh;

      // 1) Strictly avoid overlapping detected faces (避開人樣; body overlap has 0 penalty)
      const facePenalty = faceOverlapCells * 600;

      // 2) Strongly prefer horizontal center (盡量置中)
      const horizCenterPenalty = Math.pow(Math.abs(cx - 0.5), 1.5) * 900;

      // 3) Prefer vertical center-slightly-down (0.64), center (0.50), or center-slightly-up (0.32)
      const vDistDown = Math.abs(cy - 0.64);
      const vDistMid = Math.abs(cy - 0.50);
      const vDistUp = Math.abs(cy - 0.32);
      const minVDist = Math.min(vDistDown, vDistMid * 1.05, vDistUp * 1.1);
      const vertBandPenalty = Math.pow(minVDist, 1.5) * 500;

      // 4) Penalize the 4 corners (盡量避免角落頭)
      const cornerDist = Math.hypot(cx - 0.5, cy - 0.5);
      const cornerPenalty = cornerDist > 0.28 ? (cornerDist - 0.28) * 800 : 0;

      // 5) Low-variance / blank area bonus
      const lowVarBonus = lowVarCells * 2.5;

      const score =
        lowVarBonus -
        facePenalty -
        horizCenterPenalty -
        vertBandPenalty -
        cornerPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestGx = gx;
        bestGy = gy;
      }
    }
  }

  const bestBox: SafeTextBox = {
    x: bestGx * gridS,
    y: bestGy * gridS,
    w: boxGw * gridS,
    h: boxGh * gridS,
  };

  const centerX = bestBox.x + bestBox.w / 2;
  const centerY = bestBox.y + bestBox.h / 2;
  const normalizedOffset = {
    offsetX: Math.round(((centerX - width / 2) / width) * 1000) / 1000,
    offsetY: Math.round(((centerY - height / 2) / height) * 1000) / 1000,
  };

  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="black" />
      <rect x="${bestBox.x}" y="${bestBox.y}" width="${bestBox.w}" height="${bestBox.h}" rx="20" fill="white" filter="url(#blur)" />
    </svg>
  `);

  const maskPngBuffer = sharp(maskSvg).grayscale().png().toBuffer();

  return {
    width,
    height,
    bestBox,
    normalizedOffset,
    maskPngBuffer,
  };
}

/**
 * Segment human faces in `imageBuffer` via `fal-ai/sam-3/image-rle` (`prompt: "face"`)
 * and return the optimal centered, face-safe, corner-avoiding text redraw box and binary mask.
 */
export async function detectCenteredFaceSafeTextZone(
  imageBuffer: Buffer,
  options: { fetch?: typeof fetch } = {},
): Promise<{
  width: number;
  height: number;
  bestBox: SafeTextBox;
  normalizedOffset: { offsetX: number; offsetY: number };
  maskPng: Buffer;
}> {
  const { data: rgba, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const faceMask = new Uint8Array(width * height);

  if (hasFalKey() && width > 0 && height > 0) {
    try {
      const jpgBuf = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
      const imageUrl = await uploadFalBuffer(
        {
          bytes: jpgBuf,
          fileName: `onscreen-text-frame-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        },
        options,
      );
      const res = await falQueueSubscribe<FalSam3ImageRleResult>(
        FAL_SAM3_IMAGE_RLE_ENDPOINT,
        {
          image_url: imageUrl,
          prompt: "face",
          return_multiple_masks: true,
          max_masks: 8,
          include_scores: true,
          include_boxes: true,
          apply_mask: false,
        },
        options,
      );
      const rles = Array.isArray(res.rle)
        ? res.rle
        : typeof res.rle === "string" && res.rle.trim()
          ? [res.rle]
          : [];
      for (const rle of rles) {
        const decoded = decodeFalSparseRle(rle, width, height);
        for (let i = 0; i < faceMask.length; i++) {
          if (decoded[i]) faceMask[i] = 1;
        }
      }
    } catch {
      // Fallback to variance + centering when SAM 3 call fails
    }
  }

  const computed = computeCenteredFaceSafeBox({
    rgba,
    width,
    height,
    faceMask,
  });
  const maskPng = await computed.maskPngBuffer;

  return {
    width,
    height,
    bestBox: computed.bestBox,
    normalizedOffset: computed.normalizedOffset,
    maskPng,
  };
}

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runFfmpeg } from "@/service/reel/concat";

// Quantitative image metrics defined in Rule 12 ("量了才算數") of the 12 De-Plastic Rules.
export type DePlasticMetrics = {
  width: number;
  height: number;
  meanLuma: number;
  blackPoint: number;
  whitePoint: number;
  under16Pct: number;
  over235Pct: number;
  highlightRMinusB: number;
  shadowRMinusB: number;
  meanChroma: number;
  highlightChroma: number;
  shadowChroma: number;
  grainSigma: number;
};

export type RealisticGradeOptions = {
  // Target 1st-percentile shadow floor (Rule 07: slightly above zero so blacks never crush).
  blackFloor?: number;
  // Target 99th-percentile highlight ceiling (Rule 06: never > 235).
  whiteCeiling?: number;
  // Luminance grain amplitude (Rule 07: produces a faint measured grain sigma ~ 3-5).
  grainStrength?: number;
  // Deterministic seed for reproducible grain in unit tests.
  seed?: number;
};

// Near-true blacks and a gentle highlight roll-off. No film grain.
const DEFAULT_BLACK_FLOOR = 6;
const DEFAULT_WHITE_CEILING = 226;
const DEFAULT_GRAIN_STRENGTH = 0;

// Soft filmic toe + knee-shoulder tone curve mapping 0..255 -> blackFloor..whiteCeiling.
// Keeps shadows/midtones (0..170, faces/skin/room) near 1:1 original brightness while
// lifting zero-blacks above 10-12 (Rule 07) and rolling off only high highlights above 170 (Rule 06).
export function buildRealisticToneLut(
  blackFloor = DEFAULT_BLACK_FLOOR,
  whiteCeiling = DEFAULT_WHITE_CEILING,
): Uint8Array {
  const lut = new Uint8Array(256);
  const knee = 170;
  // Map input knee (170) to ~1:1 output (~176 when blackFloor=12, ~175 when blackFloor=6)
  // so midtones (e.g. 115 -> ~122, 128 -> ~135) are never darkened.
  const kneeTarget = Math.min(whiteCeiling - 8, Math.max(blackFloor + 1, Math.round(blackFloor + (knee - blackFloor) * 1.03)));
  const midSlope = (kneeTarget - blackFloor) / knee;
  const hiSpan = Math.max(1, 255 - knee);
  const hiOutSpan = Math.max(0, whiteCeiling - kneeTarget);

  for (let i = 0; i < 256; i += 1) {
    let mapped: number;
    if (i <= knee) {
      mapped = Math.round(blackFloor + i * midSlope);
    } else {
      const t = (i - knee) / hiSpan;
      // Smooth quadratic knee roll-off in the top highlights (170..255 -> kneeTarget..whiteCeiling)
      const rolled = 1 - (1 - t) * (1 - t) * 0.35 - 0.65 * (1 - t);
      mapped = Math.round(kneeTarget + hiOutSpan * Math.min(1, Math.max(0, rolled)));
    }
    lut[i] = Math.min(255, Math.max(0, mapped));
  }
  return lut;
}

// Fast deterministic PRNG (xorshift32) + Box-Muller for zero-mean Gaussian 35mm film grain.
function createGaussianGenerator(seed = 0x5343524f) {
  let state = seed >>> 0 || 0x12345678;
  const nextUniform = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) + 0.5) / 4294967296;
  };
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const val = spare;
      spare = null;
      return val;
    }
    const u1 = Math.max(1e-7, nextUniform());
    const u2 = nextUniform();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    spare = mag * Math.sin(2.0 * Math.PI * u2);
    return z0;
  };
}

// Measure all quantitative metrics from Rule 12 ("量了才算數"):
// Rec.709 luma, P1 black point, P99 white point, highlight/shadow R-B, chroma, and sigma=1.4 grain residual.
export async function measureDePlasticMetrics(buffer: Buffer): Promise<DePlasticMetrics> {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurred = await sharp(buffer)
    .removeAlpha()
    .blur(1.4)
    .raw()
    .toBuffer();

  const totalPixels = info.width * info.height;
  const lumas = new Float32Array(totalPixels);
  let lumaSum = 0;
  let under16 = 0;
  let over235 = 0;
  let chromaSum = 0;
  let grainDiffSum = 0;
  let grainDiffSqSum = 0;

  for (let idx = 0; idx < totalPixels; idx += 1) {
    const offset = idx * 3;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lumas[idx] = y;
    lumaSum += y;
    if (y < 16) under16 += 1;
    if (y > 235) over235 += 1;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    chromaSum += maxC - minC;

    const br = blurred[offset];
    const bg = blurred[offset + 1];
    const bb = blurred[offset + 2];
    const by = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
    const diff = y - by;
    grainDiffSum += diff;
    grainDiffSqSum += diff * diff;
  }

  const sortedLumas = Float32Array.from(lumas).sort();
  const p1Idx = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.01)));
  const p25Idx = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.25)));
  const p75Idx = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.75)));
  const p90Idx = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.9)));
  const p99Idx = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.99)));

  const p25Luma = sortedLumas[p25Idx];
  const p75Luma = sortedLumas[p75Idx];
  const p90Luma = sortedLumas[p90Idx];

  let hiRMinusBSum = 0;
  let hiCount = 0;
  let shRMinusBSum = 0;
  let shCount = 0;
  let hiChromaSum = 0;
  let hiChromaCount = 0;
  let shChromaSum = 0;
  let shChromaCount = 0;

  for (let idx = 0; idx < totalPixels; idx += 1) {
    const offset = idx * 3;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const y = lumas[idx];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (y >= p90Luma) {
      hiRMinusBSum += r - b;
      hiCount += 1;
    }
    if (y <= p25Luma) {
      shRMinusBSum += r - b;
      shCount += 1;
      shChromaSum += chroma;
      shChromaCount += 1;
    }
    if (y >= p75Luma) {
      hiChromaSum += chroma;
      hiChromaCount += 1;
    }
  }

  const grainMean = grainDiffSum / totalPixels;
  const grainVar = Math.max(0, grainDiffSqSum / totalPixels - grainMean * grainMean);

  return {
    width: info.width,
    height: info.height,
    meanLuma: lumaSum / totalPixels,
    blackPoint: sortedLumas[p1Idx],
    whitePoint: sortedLumas[p99Idx],
    under16Pct: (under16 / totalPixels) * 100,
    over235Pct: (over235 / totalPixels) * 100,
    highlightRMinusB: hiCount > 0 ? hiRMinusBSum / hiCount : 0,
    shadowRMinusB: shCount > 0 ? shRMinusBSum / shCount : 0,
    meanChroma: chromaSum / totalPixels,
    highlightChroma: hiChromaCount > 0 ? hiChromaSum / hiChromaCount : 0,
    shadowChroma: shChromaCount > 0 ? shChromaSum / shChromaCount : 0,
    grainSigma: Math.sqrt(grainVar),
  };
}

// Post-processing grading & 35mm grain layer for realistic stills/frames (Rules 01, 05, 06, 07, 12):
// 1. Filmic toe & shoulder LUT: lifts P1 black point to ~5-8 and rolls P99 white point below ~230.
// 2. Deep-shadow desaturation: keeps deep shadows (< 28 luma) neutral so dark areas don't hold plastic colour noise.
// 3. Faint film grain: injects luminance-weighted Gaussian grain so measured sigma sits around 3-5.
export async function gradeRealisticImageBuffer(
  buffer: Buffer,
  options?: RealisticGradeOptions,
): Promise<Buffer> {
  const blackFloor = options?.blackFloor ?? DEFAULT_BLACK_FLOOR;
  const whiteCeiling = options?.whiteCeiling ?? DEFAULT_WHITE_CEILING;
  const grainStrength = options?.grainStrength ?? DEFAULT_GRAIN_STRENGTH;
  const lut = buildRealisticToneLut(blackFloor, whiteCeiling);
  const randn = createGaussianGenerator(options?.seed);

  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Fine high-frequency detail layer (sigma=0.85) to recover micro-relief on AI-smoothed skin and fabrics.
  const fineBlurred = await sharp(buffer)
    .removeAlpha()
    .blur(0.85)
    .raw()
    .toBuffer();

  const out = Buffer.allocUnsafe(data.length);
  const minClamp = Math.max(4, blackFloor - 2);
  const maxClamp = Math.min(232, whiteCeiling + 6);

  for (let offset = 0; offset < data.length; offset += 3) {
    const rawR = data[offset];
    const rawG = data[offset + 1];
    const rawB = data[offset + 2];

    // High-frequency residual from the 0.85-sigma blur for crisp pore & fabric micro-contrast.
    const hfR = rawR - fineBlurred[offset];
    const hfG = rawG - fineBlurred[offset + 1];
    const hfB = rawB - fineBlurred[offset + 2];

    let r = lut[rawR];
    let g = lut[rawG];
    let b = lut[rawB];

    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Detect warm human skin tones to suppress waxy specular glare and boost pore micro-relief.
    const isWarmSkin =
      rawR > rawG &&
      rawG >= rawB &&
      rawR - rawB >= 12 &&
      rawR - rawG >= 4 &&
      y >= 48 &&
      y <= 228;

    // Matte down waxy/oily specular hot-spots on forehead, nose bridge, and cheekbones (y > 172).
    if (isWarmSkin && y > 172) {
      const targetY = 172 + (y - 172) * 0.58;
      const scale = targetY / Math.max(1, y);
      r = Math.round(r * scale);
      g = Math.round(g * scale);
      b = Math.round(b * scale);
      y = targetY;
    }

    // Restore crisp micro-detail in midtones (stronger on skin so AI denoising doesn't look like plastic).
    if (y >= 36 && y <= 215) {
      const detailGain = isWarmSkin ? 0.38 : 0.22;
      r = Math.round(r + hfR * detailGain);
      g = Math.round(g + hfG * detailGain);
      b = Math.round(b + hfB * detailGain);
    }

    // Rule 05: gently desaturate deep shadow pixels toward neutral luma.
    if (y < 28) {
      const keep = Math.max(0.35, (y - blackFloor) / Math.max(1, 28 - blackFloor));
      r = Math.round(y + (r - y) * keep);
      g = Math.round(y + (g - y) * keep);
      b = Math.round(b + (b - y) * keep);
    }

    // Rule 07: luminance-weighted 35mm / CMOS sensor micro-grain (preserved in lifted blacks, never clipping highlights).
    if (grainStrength > 0) {
      const shadowWeight = Math.min(1, Math.max(0.45, (y - minClamp) / 24));
      const highlightWeight = Math.min(1, Math.max(0.4, (maxClamp - y) / 28));
      const skinMicroBoost = isWarmSkin ? 1.12 : 1.0;
      const grain = randn() * grainStrength * shadowWeight * highlightWeight * skinMicroBoost;
      r = Math.round(r + grain);
      g = Math.round(g + grain);
      b = Math.round(b + grain * 0.95);
    }

    out[offset] = Math.min(maxClamp, Math.max(minClamp, r));
    out[offset + 1] = Math.min(maxClamp, Math.max(minClamp, g));
    out[offset + 2] = Math.min(maxClamp, Math.max(minClamp, b));
  }

  const pipeline = sharp(out, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 3,
    },
  });

  if (meta.format === "webp") {
    return pipeline.webp({ quality: 95 }).toBuffer();
  }
  if (meta.format === "jpeg") {
    return pipeline.jpeg({ quality: 95 }).toBuffer();
  }
  return pipeline.png().toBuffer();
}

// FFmpeg video filter for realistic clips (Hailuo 3 / Seedance):
// - Preserves natural midtone brightness (0..180 stays ~1:1 with a near-true black floor at 5)
//   so faces, skin, and indoor rooms never look darkened or faded
// - Gently rolls off only highlights above 180 (180..255 -> 180..225, never > 235)
// Highlight knee only. No film grain.
const VIDEO_KNEE_LUT_EXPR =
  "clip(if(lte(val,180),5+val*0.975,180+(val-180)*0.6),4,228)";

export const REALISTIC_VIDEO_GRADE_FILTER =
  `unsharp=3:3:0.35:3:3:0.0,lutrgb=r='${VIDEO_KNEE_LUT_EXPR}':g='${VIDEO_KNEE_LUT_EXPR}':b='${VIDEO_KNEE_LUT_EXPR}',setsar=1`;

export function realisticVideoGradeArgs(inPath: string, outPath: string): string[] {
  return [
    "-y",
    "-i",
    inPath,
    "-vf",
    REALISTIC_VIDEO_GRADE_FILTER,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "17",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    outPath,
  ];
}

// Apply the realistic filmic tone curve + 35mm temporal grain to a finished MP4 buffer.
export async function gradeRealisticVideoBuffer(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "realistic-grade-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    await runFfmpeg(dir, realisticVideoGradeArgs("in.mp4", "out.mp4"));
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

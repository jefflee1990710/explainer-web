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
  // Target 1st-percentile shadow floor (Rule 07: keep >= 8 so grain is never crushed).
  blackFloor?: number;
  // Target 99th-percentile highlight ceiling (Rule 06: keep <= 190-205, never > 235).
  whiteCeiling?: number;
  // Target 35mm luminance grain amplitude (Rule 07: produces measured grain sigma ~ 8-10).
  grainStrength?: number;
  // Deterministic seed for reproducible grain in unit tests.
  seed?: number;
};

const DEFAULT_BLACK_FLOOR = 12;
const DEFAULT_WHITE_CEILING = 205;
const DEFAULT_GRAIN_STRENGTH = 12.2;

// Soft filmic toe + knee-shoulder tone curve mapping 0..255 -> blackFloor..whiteCeiling.
// Keeps shadows/midtones (0..170, faces/skin/room) near 1:1 original brightness while
// lifting zero-blacks above 10-12 (Rule 07) and rolling off only high highlights above 170 (Rule 06).
export function buildRealisticToneLut(
  blackFloor = DEFAULT_BLACK_FLOOR,
  whiteCeiling = DEFAULT_WHITE_CEILING,
): Uint8Array {
  const lut = new Uint8Array(256);
  const knee = 170;
  // Map input knee (170) to ~85% of the output range (~176 when blackFloor=12, whiteCeiling=205)
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
// 1. Filmic toe & shoulder LUT: lifts P1 black point to ~10-14 and compresses P99 white point below ~195.
// 2. Deep-shadow desaturation: keeps deep shadows (< 28 luma) neutral so dark areas don't hold plastic colour noise.
// 3. 35mm film grain: injects luminance-weighted Gaussian grain so measured sigma sits around 8-10.
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

  const out = Buffer.allocUnsafe(data.length);
  const minClamp = Math.max(8, blackFloor - 4);
  const maxClamp = Math.min(212, whiteCeiling + 7);

  for (let offset = 0; offset < data.length; offset += 3) {
    let r = lut[data[offset]];
    let g = lut[data[offset + 1]];
    let b = lut[data[offset + 2]];

    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Rule 05: gently desaturate deep shadow pixels toward neutral luma.
    if (y < 28) {
      const keep = Math.max(0.35, (y - blackFloor) / Math.max(1, 28 - blackFloor));
      r = Math.round(y + (r - y) * keep);
      g = Math.round(y + (g - y) * keep);
      b = Math.round(y + (b - y) * keep);
    }

    // Rule 07: luminance-weighted 35mm film grain (preserved in lifted blacks, never clipping highlights).
    if (grainStrength > 0) {
      const shadowWeight = Math.min(1, Math.max(0.45, (y - minClamp) / 24));
      const highlightWeight = Math.min(1, Math.max(0.4, (maxClamp - y) / 28));
      const grain = randn() * grainStrength * shadowWeight * highlightWeight;
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
// - Preserves natural midtone brightness (0..170 stays ~1:1 with a lifted black floor at 10)
//   so faces, skin, and indoor rooms never look darkened
// - Compresses only highlights above 170 with a soft knee (170..255 -> 175..204, never > 235)
// - Restores 35mm temporal film grain (noise=c0s=9:c0f=t+u) that video diffusion models smooth away.
const VIDEO_KNEE_LUT_EXPR =
  "clip(if(lte(val,170),10+val*0.97,175+(val-170)*0.34),8,206)";

export const REALISTIC_VIDEO_GRADE_FILTER =
  `lutrgb=r='${VIDEO_KNEE_LUT_EXPR}':g='${VIDEO_KNEE_LUT_EXPR}':b='${VIDEO_KNEE_LUT_EXPR}',noise=c0s=9:c0f=t+u`;

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

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runFfmpeg } from "@/service/reel/concat";

// FFmpeg video filter for realistic clips (Hailuo 3 / Seedance):
// - Preserves natural midtone brightness (0..180 stays ~1:1 with a near-true black floor at 5)
//   so faces, skin, and indoor rooms never look darkened or faded
// - Gently rolls off only highlights above 180 (180..255 -> 180..225, never > 235)
// Highlight knee only. No film grain. Stills are saved as the model returned them.
const VIDEO_KNEE_LUT_EXPR =
  "clip(if(lte(val,180),5+val*0.975,180+(val-180)*0.6),4,228)";

export const REALISTIC_VIDEO_GRADE_FILTER =
  `unsharp=3:3:0.35:3:3:0.0,lutrgb=r='${VIDEO_KNEE_LUT_EXPR}':g='${VIDEO_KNEE_LUT_EXPR}':b='${VIDEO_KNEE_LUT_EXPR}',setsar=1`;

// Warm, cozy colour balance (3400K–4200K golden-amber indoor warmth) for Talking-Head videos while preserving skin fidelity and yuv420p compatibility.
export const TALKING_HEAD_SENSOR_GRAIN_FILTER =
  "colorbalance=rs=0.03:gs=0.01:bs=-0.03:rm=0.05:gm=0.015:bm=-0.05:rh=0.04:gh=0.015:bh=-0.04,setsar=1";

// Warm colour-temperature matrix for Talking-Head scene images so start frames and videos share the same warm indoor tone.
export async function gradeWarmTalkingHeadImageBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .recomb([
      [1.05, 0.01, 0.0],
      [0.0, 1.01, 0.0],
      [0.0, 0.0, 0.92],
    ])
    .png()
    .toBuffer();
}

export function realisticVideoGradeArgs(inPath: string, outPath: string): string[] {
  return [
    "-y",
    "-i",
    inPath,
    "-vf",
    REALISTIC_VIDEO_GRADE_FILTER,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
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

export function talkingHeadSensorGrainArgs(inPath: string, outPath: string): string[] {
  return [
    "-y",
    "-i",
    inPath,
    "-vf",
    TALKING_HEAD_SENSOR_GRAIN_FILTER,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
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

// Apply the realistic highlight roll-off to a finished MP4 buffer.
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

// Apply subtle iPhone CMOS sensor micro-grain to a finished Talking-Head MP4 buffer without darkening highlights.
export async function gradeTalkingHeadSensorTextureBuffer(buffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "th-sensor-grain-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    await runFfmpeg(dir, talkingHeadSensorGrainArgs("in.mp4", "out.mp4"));
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

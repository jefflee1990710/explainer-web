import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildJutsuColorFilter,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-settings";
import { runFfmpeg } from "@/service/reel/concat";

// Apply OpenJutsu's "Fix colours" (H3 Soft: detail_contrast -0.20 + Reinhard tone mapper
// with gentle highlight rolloff, lifted shadows, and softened digital crunch) to all realistic videos.
export const REALISTIC_VIDEO_GRADE_FILTER = buildJutsuColorFilter(
  DEFAULT_JUTSU_COLOR_SETTINGS,
);

// Apply OpenJutsu's "Fix colours" (H3 Soft) to Talking-Head videos as well.
export const TALKING_HEAD_SENSOR_GRAIN_FILTER = REALISTIC_VIDEO_GRADE_FILTER;

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

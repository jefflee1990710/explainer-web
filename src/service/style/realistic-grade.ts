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

// Organic one-handed smartphone selfie drift + occasional subtle wrist shake (4.5% overscan with multi-sine crop motion).
export const HANDHELD_SELFIE_SHAKE_FILTER =
  "scale=trunc(iw*1.045/2)*2:trunc(ih*1.045/2)*2:flags=lanczos,crop=trunc(iw/1.045/2)*2:trunc(ih/1.045/2)*2:x='(iw-ow)/2+((iw-ow)*0.36)*(0.55*sin(t*1.7)+0.30*sin(t*3.9+0.8)+0.15*sin(t*9.3)*max(0,sin(t*1.1-0.4)))':y='(ih-oh)/2+((ih-oh)*0.36)*(0.55*cos(t*1.4+0.5)+0.30*sin(t*3.3)+0.15*cos(t*8.7)*max(0,sin(t*1.1-0.4)))'";

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

export function talkingHeadSensorGrainArgs(
  inPath: string,
  outPath: string,
  options?: { handheldSelfie?: boolean },
): string[] {
  const vf = options?.handheldSelfie
    ? `${HANDHELD_SELFIE_SHAKE_FILTER},${TALKING_HEAD_SENSOR_GRAIN_FILTER}`
    : TALKING_HEAD_SENSOR_GRAIN_FILTER;
  return [
    "-y",
    "-i",
    inPath,
    "-vf",
    vf,
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

// Apply OpenJutsu H3 Soft colour grade (and optional handheld selfie shake) to a finished Talking-Head MP4 buffer.
export async function gradeTalkingHeadSensorTextureBuffer(
  buffer: Buffer,
  options?: { handheldSelfie?: boolean },
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "th-sensor-grain-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    await runFfmpeg(dir, talkingHeadSensorGrainArgs("in.mp4", "out.mp4", options));
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

// Read the container duration ffmpeg prints for the first input.
export function parseFfmpegDurationSeconds(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// Read the first video stream size, for example `1280x720`.
export function parseFfmpegVideoSize(stderr: string): { width: number; height: number } | null {
  const match = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

// Read the first video stream frame rate.
export function parseFfmpegFps(stderr: string): number | null {
  const match = stderr.match(/Video:.*?(\d+(?:\.\d+)?)\s+fps/);
  if (!match) return null;
  const fps = Number(match[1]);
  return fps > 0 ? fps : null;
}

function stamp(seconds: number): string {
  return Math.max(0, seconds).toFixed(3);
}

// Build the filter that drops `section` into `source` at [start, start+length] and keeps the rest.
export function spliceSectionFilter(input: {
  width: number;
  height: number;
  fps: number;
  start: number;
  length: number;
  hasPre: boolean;
  hasPost: boolean;
}): string {
  const mid = `[1:v]scale=${input.width}:${input.height}:flags=bicubic,fps=${input.fps},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=30,trim=duration=${stamp(input.length)},setpts=PTS-STARTPTS,format=yuv420p[mid]`;
  if (!input.hasPre && !input.hasPost) return mid.replace("[mid]", "[v]");
  const parts = [mid];
  const labels: string[] = [];
  if (input.hasPre) {
    parts.push(`[0:v]trim=start=0:end=${stamp(input.start)},setpts=PTS-STARTPTS,format=yuv420p[pre]`);
    labels.push("[pre]");
  }
  labels.push("[mid]");
  if (input.hasPost) {
    parts.push(
      `[0:v]trim=start=${stamp(input.start + input.length)},setpts=PTS-STARTPTS,format=yuv420p[post]`,
    );
    labels.push("[post]");
  }
  parts.push(`${labels.join("")}concat=n=${labels.length}:v=1:a=0[v]`);
  return parts.join(";");
}

// Replace one time range in a clip and keep the original audio.
// `section` is only that range (the Comfy output), not the full clip.
export async function spliceVideoSection(input: {
  source: Buffer;
  section: Buffer;
  start: number;
  length: number;
}): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "onscreen-splice-"));
  try {
    await writeFile(join(dir, "source.mp4"), input.source);
    await writeFile(join(dir, "section.mp4"), input.section);
    const stderr = await ffmpegStderr(dir, ["-i", "source.mp4"]);
    const duration = parseFfmpegDurationSeconds(stderr) ?? input.start + input.length;
    const size = parseFfmpegVideoSize(stderr) ?? { width: 720, height: 1280 };
    const fps = parseFfmpegFps(stderr) ?? 24;
    const hasAudio = /Audio:/.test(stderr);
    const start = Math.max(0, input.start);
    const length = Math.max(0.1, Math.min(input.length, Math.max(0.1, duration - start)));
    const end = start + length;
    const filter = spliceSectionFilter({
      width: size.width,
      height: size.height,
      fps,
      start,
      length,
      hasPre: start > 0.04,
      hasPost: end < duration - 0.04,
    });
    await runFfmpeg(dir, [
      "-y",
      "-i",
      "source.mp4",
      "-i",
      "section.mp4",
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      ...(hasAudio ? ["-map", "0:a:0", "-c:a", "copy"] : []),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "out.mp4",
    ]);
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Grab one JPEG frame from a clip so a later sentence can be painted on that moment.
export async function extractVideoFrameJpeg(video: Buffer, seconds: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "onscreen-frame-"));
  try {
    await writeFile(join(dir, "in.mp4"), video);
    await runFfmpeg(dir, [
      "-y",
      "-i",
      "in.mp4",
      "-ss",
      stamp(seconds),
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "frame.jpg",
    ]);
    return await readFile(join(dir, "frame.jpg"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

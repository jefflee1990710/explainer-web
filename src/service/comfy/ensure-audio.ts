import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

const MAX_COMFY_SHORT_EDGE = 736;

function parseVideoDimensions(stderr: string): { width: number; height: number } | null {
  for (const line of stderr.split("\n")) {
    if (!line.includes("Video:")) continue;
    const match = line.match(/\b(\d{2,5})x(\d{2,5})\b/);
    if (match) {
      const width = Number(match[1]);
      const height = Number(match[2]);
      if (width > 0 && height > 0) return { width, height };
    }
  }
  return null;
}

/**
 * ComfyUI's execution engine iterates over `VHS_LoadVideo` outputs during `cache_update`
 * (`comfy/model_patcher.py`) before `H3SoundtrackOrSilence` runs. When an uploaded `.mp4`
 * has no audio stream at all, `LazyAudioMap.__iter__` invokes `ffmpeg -f f32le -` and raises
 * `VHS failed to extract audio from /workspace/ComfyUI/input/scro-...mp4`.
 *
 * In addition, when a user uploads a high-resolution (e.g. 1440x2560 or 4K) 60fps source video,
 * `VHS_LoadVideo` loads all frames as uncompressed `float32` tensors at native resolution
 * (15–35 GB+) before `H3SourceSlice` crops/downscales to `736p`, which can trigger a Linux
 * cgroup OOM kill on ComfyUI.
 *
 * This helper probes the MP4 buffer:
 * - If `Math.min(width, height) <= 736` and it already has `Audio:`, returns `videoBuffer` untouched.
 * - If `Math.min(width, height) > 736`, downscales the short edge to `736` (16-aligned long edge)
 *   at 24fps so `VHS_LoadVideo` never allocates oversized tensors.
 * - If it lacks an `Audio:` stream, muxes a silent stereo 44.1kHz AAC track.
 */
export async function ensureMp4HasAudioStream(videoBuffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "comfy-audio-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBuffer);
    const probe = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    const hasAudio = /Audio:/.test(probe);
    const dims = parseVideoDimensions(probe);
    const needsDownscale =
      dims !== null && Math.min(dims.width, dims.height) > MAX_COMFY_SHORT_EDGE;

    if (hasAudio && !needsDownscale) {
      return videoBuffer;
    }

    let videoCodecArgs: string[] = ["-c:v", "copy"];
    if (needsDownscale && dims) {
      const scale = MAX_COMFY_SHORT_EDGE / Math.min(dims.width, dims.height);
      const targetW =
        dims.width <= dims.height
          ? MAX_COMFY_SHORT_EDGE
          : Math.max(16, Math.round((dims.width * scale) / 16) * 16);
      const targetH =
        dims.height <= dims.width
          ? MAX_COMFY_SHORT_EDGE
          : Math.max(16, Math.round((dims.height * scale) / 16) * 16);
      videoCodecArgs = [
        "-vf",
        `scale=${targetW}:${targetH}`,
        "-r",
        "24",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
      ];
    }

    if (hasAudio) {
      await runFfmpeg(dir, [
        "-y",
        "-i",
        "in.mp4",
        ...videoCodecArgs,
        "-c:a",
        "copy",
        "out.mp4",
      ]);
    } else {
      await runFfmpeg(dir, [
        "-y",
        "-i",
        "in.mp4",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        ...videoCodecArgs,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        "out.mp4",
      ]);
    }
    const muxed = await readFile(join(dir, "out.mp4"));
    return muxed.byteLength > 0 ? muxed : videoBuffer;
  } catch {
    return videoBuffer;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

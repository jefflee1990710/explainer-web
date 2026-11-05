import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

/**
 * ComfyUI's execution engine iterates over `VHS_LoadVideo` outputs during `cache_update`
 * (`comfy/model_patcher.py`) before `H3SoundtrackOrSilence` runs. When an uploaded `.mp4`
 * has no audio stream at all, `LazyAudioMap.__iter__` invokes `ffmpeg -f f32le -` and raises
 * `VHS failed to extract audio from /workspace/ComfyUI/input/scro-...mp4`.
 *
 * This helper probes the MP4 buffer and, if it lacks an `Audio:` stream, stream-copies the
 * video (`-c:v copy`) while muxing a silent stereo 44.1kHz AAC track so `VHS_LoadVideo`
 * always succeeds without re-encoding video frames.
 */
export async function ensureMp4HasAudioStream(videoBuffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "comfy-audio-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBuffer);
    const probe = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    if (/Audio:/.test(probe)) {
      return videoBuffer;
    }

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
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      "out.mp4",
    ]);
    const muxed = await readFile(join(dir, "out.mp4"));
    return muxed.byteLength > 0 ? muxed : videoBuffer;
  } catch {
    return videoBuffer;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

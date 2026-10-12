import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, fetchBuffer, runFfmpeg } from "@/service/reel/concat";
import { REEL_TIMEOUT_MESSAGE } from "@/service/reel/timeout";
import { parseProbe } from "@/service/video-edit/probe";
import { subtitleBurnArgs, subtitleFrameSize, type SubtitleAspect } from "@/service/video-edit/subtitle-export";

// Burn each clip's subtitle plate in order. Returns one mp4 per clip, ready to concat.
// A clip with no plate is a hard error: the reel must never ship without its subtitle.
export async function burnSubtitlePlates(input: {
  clipUrls: string[];
  plateUrls: string[];
  aspect: SubtitleAspect;
  timeoutMs: number;
  onProgress?: (done: number, total: number) => Promise<void> | void;
}) {
  const { width, height } = subtitleFrameSize(input.aspect);
  const started = Date.now();
  const timeLeft = () => {
    const left = input.timeoutMs - (Date.now() - started);
    if (left <= 0) throw new Error(REEL_TIMEOUT_MESSAGE);
    return left;
  };
  const dir = await mkdtemp(join(tmpdir(), "burn-"));
  try {
    const burned: Buffer[] = [];
    for (let index = 0; index < input.clipUrls.length; index += 1) {
      await input.onProgress?.(index, input.clipUrls.length);
      const clip = `clip${index}.mp4`;
      const plate = `plate${index}.png`;
      const out = `burned${index}.mp4`;
      await writeFile(join(dir, clip), await fetchBuffer(input.clipUrls[index], `第 ${index + 1} 段`, timeLeft()));
      await writeFile(join(dir, plate), await fetchBuffer(input.plateUrls[index], `第 ${index + 1} 段字幕圖`, timeLeft()));
      const probe = parseProbe(await ffmpegStderr(dir, ["-i", clip], timeLeft()));
      await runFfmpeg(
        dir,
        [
          "-y",
          ...subtitleBurnArgs({
            clip,
            plate,
            out,
            durationSec: probe.durationSec || 5,
            fps: probe.fps,
            hasAudio: probe.hasAudio,
            aspect: input.aspect,
            width,
            height,
          }),
        ],
        timeLeft(),
      );
      burned.push(await readFile(join(dir, out)));
      await rm(join(dir, clip), { force: true });
      await rm(join(dir, plate), { force: true });
      await rm(join(dir, out), { force: true });
    }
    return burned;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

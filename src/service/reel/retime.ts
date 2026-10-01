import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

// atempo accepts 0.5–2.0 per stage on older ffmpeg; chain stages past that.
export function atempoChain(speed: number) {
  const stages: string[] = [];
  let left = speed;
  while (left > 2) {
    stages.push("atempo=2");
    left /= 2;
  }
  while (left < 0.5) {
    stages.push("atempo=0.5");
    left /= 0.5;
  }
  stages.push(`atempo=${Math.round(left * 10000) / 10000}`);
  return stages.join(",");
}

// Speed a clip up (or down) so it lasts `targetSeconds`. Keeps the first and
// last frame, so a first+last-frame I2V clip still lands on its end still.
export async function retimeMp4(buffer: Buffer, targetSeconds: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "retime-"));
  try {
    await writeFile(join(dir, "in.mp4"), buffer);
    const stderr = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) return buffer;
    const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    // Already close enough: leave the file untouched.
    if (!(duration > 0) || Math.abs(duration - targetSeconds) < 0.15) return buffer;

    const speed = duration / targetSeconds;
    const hasAudio = /Audio:/.test(stderr);
    const args = ["-y", "-i", "in.mp4", "-filter:v", `setpts=PTS/${speed}`];
    if (hasAudio) args.push("-filter:a", atempoChain(speed), "-c:a", "aac", "-ac", "2");
    args.push(
      "-t",
      String(targetSeconds),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "out.mp4",
    );
    await runFfmpeg(dir, args);
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

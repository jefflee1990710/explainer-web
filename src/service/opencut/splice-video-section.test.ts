import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import {
  extractVideoFrameJpeg,
  parseFfmpegDurationSeconds,
  parseFfmpegFps,
  parseFfmpegVideoSize,
  spliceVideoSection,
} from "@/service/opencut/splice-video-section";

test("ffmpeg probe parsers read duration, size, and fps", () => {
  const stderr = "Duration: 00:00:06.04, start: 0.000000\nStream #0:0: Video: h264, yuv420p, 720x1280, 24 fps, 24 tbr";
  assert.equal(parseFfmpegDurationSeconds(stderr), 6.04);
  assert.deepEqual(parseFfmpegVideoSize(stderr), { width: 720, height: 1280 });
  assert.equal(parseFfmpegFps(stderr), 24);
});

function makeClip(dir: string, name: string, color: string, seconds: number) {
  assert.ok(ffmpegPath);
  const dest = join(dir, name);
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=64x64:d=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-shortest",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      dest,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return dest;
}

async function pixelAt(video: Buffer, seconds: number) {
  const frame = await extractVideoFrameJpeg(video, seconds);
  const data = await sharp(frame).resize(1, 1, { fit: "fill" }).removeAlpha().raw().toBuffer();
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 };
}

test("spliceVideoSection keeps the head and tail and replaces only the middle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "splice-test-"));
  try {
    const source = await readFile(makeClip(dir, "source.mp4", "red", 2));
    const section = await readFile(makeClip(dir, "section.mp4", "blue", 1));
    const merged = await spliceVideoSection({ source, section, start: 0.5, length: 1 });
    const head = await pixelAt(merged, 0.15);
    const middle = await pixelAt(merged, 1);
    const tail = await pixelAt(merged, 1.7);
    assert.ok(head.r > head.b, `head should stay red, got ${head.r},${head.g},${head.b}`);
    assert.ok(middle.b > middle.r, `middle should be blue, got ${middle.r},${middle.g},${middle.b}`);
    assert.ok(tail.r > tail.b, `tail should stay red, got ${tail.r},${tail.g},${tail.b}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

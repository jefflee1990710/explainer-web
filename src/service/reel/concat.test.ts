import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { concatMp4Buffers } from "@/service/reel/concat";

function makeClip(dir: string, name: string, color: string) {
  assert.ok(ffmpegPath);
  const dest = join(dir, name);
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=64x64:d=0.2`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      dest,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return dest;
}

test("concatMp4Buffers joins same-codec clips into one mp4", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reel-test-"));
  try {
    const a = await readFile(makeClip(dir, "a.mp4", "red"));
    const b = await readFile(makeClip(dir, "b.mp4", "blue"));
    const reel = await concatMp4Buffers([a, b]);
    assert.ok(reel.length > a.length);
    const out = join(dir, "out.mp4");
    await writeFile(out, reel);
    const probe = spawnSync(
      ffmpegPath!,
      ["-i", out, "-f", "null", "-"],
      { encoding: "utf8" },
    );
    assert.match(probe.stderr, /Duration: 00:00:00\.6/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("concatMp4Buffers joins many clips in one pass with a hold between each", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reel-test-"));
  try {
    const clips = await Promise.all(
      ["red", "blue", "green", "white"].map((color) => readFile(makeClip(dir, `${color}.mp4`, color))),
    );
    const reel = await concatMp4Buffers(clips);
    const out = join(dir, "out.mp4");
    await writeFile(out, reel);
    const probe = spawnSync(ffmpegPath!, ["-i", out, "-f", "null", "-"], { encoding: "utf8" });
    // Four 0.2s clips plus three 0.2s holds.
    assert.match(probe.stderr, /Duration: 00:00:01\.(3|4)/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ffmpegStderr and runFfmpeg use resolveFfmpegBinary (FFMPEG_PATH) instead of raw ffmpeg-static", async () => {
  const { ffmpegStderr, runFfmpeg } = await import("@/service/reel/concat");
  const { chmod } = await import("node:fs/promises");
  const dir = await mkdtemp(join(tmpdir(), "reel-bin-test-"));
  const prevFfmpegPath = process.env.FFMPEG_PATH;
  try {
    const markerFile = join(dir, "invoked.log");
    const wrapperBin = join(dir, "custom-ffmpeg.sh");
    const realBin = ffmpegPath!;
    await writeFile(
      wrapperBin,
      `#!/bin/sh\necho "called" >> "${markerFile}"\nexec "${realBin}" "$@"\n`,
      "utf8",
    );
    await chmod(wrapperBin, 0o755);
    process.env.FFMPEG_PATH = wrapperBin;

    makeClip(dir, "in.mp4", "red");
    const stderr = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    assert.match(stderr, /Video: h264/);

    await runFfmpeg(dir, ["-y", "-i", "in.mp4", "-frames:v", "1", "out.webp"]);
    const invocations = (await readFile(markerFile, "utf8")).trim().split("\n");
    assert.equal(invocations.length, 2);
  } finally {
    if (prevFfmpegPath === undefined) {
      delete process.env.FFMPEG_PATH;
    } else {
      process.env.FFMPEG_PATH = prevFfmpegPath;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

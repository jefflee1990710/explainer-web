import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { concatMp4Buffers } from "./concat";

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
    assert.match(probe.stderr, /Duration: 00:00:00\.4/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

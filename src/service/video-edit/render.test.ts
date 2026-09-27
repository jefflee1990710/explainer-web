import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { parseProbe, renderFinalFromBuffers } from "@/service/video-edit/render";

test("parseProbe reads size, fps, duration, and audio", () => {
  const stderr = [
    "  Duration: 00:00:07.04, start: 0.000000, bitrate: 1200 kb/s",
    "  Stream #0:0: Video: h264 (High), yuv420p, 1080x1920 [SAR 1:1 DAR 9:16], 24 fps, 24 tbr",
    "  Stream #0:1: Audio: aac (LC), 44100 Hz, stereo",
  ].join("\n");
  assert.deepEqual(parseProbe(stderr), { width: 1080, height: 1920, fps: 24, durationSec: 7.04, hasAudio: true });
});

function run(args: string[]) {
  assert.ok(ffmpegPath);
  const result = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

test("renderFinalFromBuffers adds a logo and a 1s image intro", async () => {
  const dir = await mkdtemp(join(tmpdir(), "final-test-"));
  try {
    const reelPath = join(dir, "reel.mp4");
    run([
      "-y", "-f", "lavfi", "-i", "color=c=blue:s=64x112:d=1:r=24",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", reelPath,
    ]);
    const pngPath = join(dir, "logo.png");
    run(["-y", "-f", "lavfi", "-i", "color=c=red:s=16x16", "-frames:v", "1", pngPath]);

    const png = await readFile(pngPath);
    const out = await renderFinalFromBuffers({
      reel: await readFile(reelPath),
      layers: [
        {
          file: { buffer: png, ext: "png" },
          layer: { id: "a", kind: "image", assetUrl: "https://x/logo.png", anchor: "top-right", marginPct: 4, widthPct: 25, opacity: 0.8 },
        },
      ],
      intro: { file: { buffer: png, ext: "png" }, clip: { kind: "image", assetUrl: "https://x/i.png", durationSec: 1 } },
    });

    const outPath = join(dir, "out.mp4");
    await writeFile(outPath, out);
    const probe = spawnSync(ffmpegPath!, ["-i", outPath], { encoding: "utf8" });
    const probed = parseProbe(probe.stderr);
    assert.equal(probed.width, 64);
    assert.equal(probed.height, 112);
    assert.ok(probed.durationSec > 1.8 && probed.durationSec < 2.3, `duration ${probed.durationSec}`);
    assert.equal(probed.hasAudio, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { fitClipArgs, joinPadArgs, stillClipArgs } from "@/service/reel/join-pad";

const VIDEO = "Stream #0:0: Video: h264, yuv420p, 64x64, 25 fps, 25 tbr";

test("a silent clip pads video only", () => {
  const args = joinPadArgs("left.mp4", "pad.mp4", VIDEO);
  assert.equal(args.includes("-an"), true);
  assert.match(args.join(" "), /tpad=stop_mode=clone:stop_duration=0.2/);
  assert.equal(args.at(-1), "pad.mp4");
});

test("a still bookend matches the clip frame and stays silent when the clip has no audio", () => {
  const args = stillClipArgs("end.png", "end.mp4", { width: 1080, height: 1920, fps: 30, hasAudio: false }, 2);
  assert.match(args.join(" "), /scale=1080:1920/);
  assert.equal(args.includes("-an"), true);
  assert.equal(args.at(-1), "end.mp4");
});

test("a mismatched video is scaled to the clip frame and keeps its audio", () => {
  const args = fitClipArgs("outro.mp4", "outro-fit.mp4", { width: 1080, height: 1920, fps: 24, hasAudio: true }, true);
  assert.match(args.join(" "), /scale=1080:1920:force_original_aspect_ratio=increase/);
  assert.match(args.join(" "), /fps=24/);
  assert.equal(args.includes("-an"), false);
  assert.equal(args.at(-1), "outro-fit.mp4");
});

test("a silent mismatched video stays silent when the clip has no audio", () => {
  const args = fitClipArgs("outro.mp4", "outro-fit.mp4", { width: 720, height: 1280, fps: 30, hasAudio: false }, true);
  assert.equal(args.includes("-an"), true);
});

test("a 24fps clip with audio still yields a pad with a video frame", async () => {
  assert.ok(ffmpegPath);
  const dir = await mkdtemp(join(tmpdir(), "pad-test-"));
  try {
    const clip = join(dir, "clip.mp4");
    const made = spawnSync(
      ffmpegPath,
      [
        "-y", "-f", "lavfi", "-i", "testsrc=s=64x64:r=24:d=1",
        "-f", "lavfi", "-i", "anullsrc=r=32000:cl=stereo",
        "-t", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", clip,
      ],
      { encoding: "utf8" },
    );
    assert.equal(made.status, 0, made.stderr);
    const probe = spawnSync(ffmpegPath, ["-i", clip], { encoding: "utf8" }).stderr;
    const pad = join(dir, "pad.mp4");
    const run = spawnSync(ffmpegPath, ["-y", ...joinPadArgs(clip, pad, probe)], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.match(spawnSync(ffmpegPath, ["-i", pad], { encoding: "utf8" }).stderr, /Video: h264/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a clip with audio also pads silence in the same layout", () => {
  const args = joinPadArgs("left.mp4", "pad.mp4", `${VIDEO}\nStream #0:1: Audio: aac, 44100 Hz, stereo`);
  assert.match(args.join(" "), /anullsrc=r=44100:cl=stereo/);
  assert.equal(args.includes("-an"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVideoCodecArgs,
  probeNvencSupport,
  resetVideoEncoderCacheForTests,
  resolveFfmpegBinary,
  rewriteArgsForNvenc,
  setVideoEncoderModeForTests,
} from "@/service/ffmpeg/video-encoder";

test("buildVideoCodecArgs returns libx264 args by default", () => {
  resetVideoEncoderCacheForTests();
  assert.deepEqual(buildVideoCodecArgs(), ["-c:v", "libx264"]);
  assert.deepEqual(buildVideoCodecArgs({ pixFmt: "yuv420p" }), [
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
  ]);
});

test("buildVideoCodecArgs returns h264_nvenc args when GPU encoder is active", () => {
  setVideoEncoderModeForTests("nvenc");
  try {
    assert.deepEqual(buildVideoCodecArgs({ pixFmt: "yuv420p" }), [
      "-c:v",
      "h264_nvenc",
      "-preset",
      "p4",
      "-cq",
      "20",
      "-pix_fmt",
      "yuv420p",
    ]);
  } finally {
    resetVideoEncoderCacheForTests();
  }
});

test("probeNvencSupport verifies a 1-frame encode and falls back to cpu on failure", async () => {
  resetVideoEncoderCacheForTests();
  const okMode = await probeNvencSupport({
    runProbe: async () => true,
  });
  assert.equal(okMode, "nvenc");

  resetVideoEncoderCacheForTests();
  const fallbackMode = await probeNvencSupport({
    runProbe: async () => false,
  });
  assert.equal(fallbackMode, "cpu");
  resetVideoEncoderCacheForTests();
});

test("resolveFfmpegBinary returns a valid executable path", () => {
  const bin = resolveFfmpegBinary();
  assert.equal(typeof bin, "string");
  assert.ok(bin.length > 0);
});

test("resolveFfmpegBinary never returns a missing ffmpeg-static path when binary is not installed", () => {
  const bin = resolveFfmpegBinary({
    ffmpegStatic: "/workspace/explainer-worker/node_modules/ffmpeg-static/ffmpeg",
    systemCandidates: ["/nonexistent/usr/bin/ffmpeg"],
  });
  assert.notEqual(
    bin,
    "/workspace/explainer-worker/node_modules/ffmpeg-static/ffmpeg",
  );
  assert.equal(bin, "ffmpeg");
});


test("rewriteArgsForNvenc transforms libx264 flags to h264_nvenc in nvenc mode", () => {
  const input = [
    "-y",
    "-i",
    "in.mp4",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "out.mp4",
  ];
  assert.deepEqual(rewriteArgsForNvenc(input, "cpu"), input);
  assert.deepEqual(rewriteArgsForNvenc(input, "nvenc"), [
    "-y",
    "-i",
    "in.mp4",
    "-c:v",
    "h264_nvenc",
    "-preset",
    "p4",
    "-cq",
    "18",
    "-pix_fmt",
    "yuv420p",
    "out.mp4",
  ]);
});


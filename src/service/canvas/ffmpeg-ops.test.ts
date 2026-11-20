import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import {
  buildCanvasFfmpegArgs,
  executeCanvasFfmpegJob,
} from "@/service/canvas/ffmpeg-ops";

describe("canvas ffmpeg ops — arg builders", () => {
  it("builds ffmpeg:concat args normalizing resolution and silent clips across cut/pad/fade", () => {
    const cutArgs = buildCanvasFfmpegArgs(
      "ffmpeg:concat",
      { ffmpegTransition: "cut" },
      {
        videoFiles: ["v0.mp4", "v1.mp4"],
        hasAudioByVideo: [true, false],
        durationsSec: [4, 5],
      },
      "out.mp4",
    ).join(" ");

    assert.match(cutArgs, /anullsrc/);
    assert.match(cutArgs, /concat=n=2:v=1:a=1/);

    const padArgs = buildCanvasFfmpegArgs(
      "ffmpeg:concat",
      { ffmpegTransition: "pad-200ms" },
      {
        videoFiles: ["v0.mp4", "v1.mp4"],
        hasAudioByVideo: [true, true],
        durationsSec: [4, 5],
      },
      "out.mp4",
    ).join(" ");
    assert.match(padArgs, /tpad=stop_mode=clone:stop_duration=0\.2/);

    const fadeArgs = buildCanvasFfmpegArgs(
      "ffmpeg:concat",
      { ffmpegTransition: "fade" },
      {
        videoFiles: ["v0.mp4", "v1.mp4"],
        hasAudioByVideo: [true, true],
        durationsSec: [4, 5],
      },
      "out.mp4",
    ).join(" ");
    assert.match(fadeArgs, /xfade=transition=fade/);
  });

  it("builds ffmpeg:audio-mux args for replace and mix-ducking modes", () => {
    const replaceArgs = buildCanvasFfmpegArgs(
      "ffmpeg:audio-mux",
      { ffmpegMixMode: "replace", ffmpegAudioGainDb: -3 },
      {
        videoFiles: ["in.mp4"],
        audioFile: "vo.mp3",
        hasAudioByVideo: [true],
      },
      "out.mp4",
    ).join(" ");

    assert.match(replaceArgs, /-map 0:v:0/);
    assert.match(replaceArgs, /volume=-3dB/);

    const duckArgs = buildCanvasFfmpegArgs(
      "ffmpeg:audio-mux",
      { ffmpegMixMode: "mix-ducking", ffmpegAudioGainDb: 0 },
      {
        videoFiles: ["in.mp4"],
        audioFile: "vo.mp3",
        hasAudioByVideo: [true],
      },
      "out.mp4",
    ).join(" ");

    assert.match(duckArgs, /sidechaincompress/);
    assert.match(duckArgs, /amix=inputs=2/);
  });

  it("builds ffmpeg:trim-speed args and skips audio filter when silent", () => {
    const withAudio = buildCanvasFfmpegArgs(
      "ffmpeg:trim-speed",
      { ffmpegStartSec: 1.5, ffmpegEndSec: 5.5, ffmpegSpeed: 1.25 },
      { videoFiles: ["in.mp4"], hasAudioByVideo: [true] },
      "out.mp4",
    ).join(" ");
    assert.match(withAudio, /-ss 1\.5/);
    assert.match(withAudio, /-to 5\.5/);
    assert.match(withAudio, /setpts=PTS\/1\.25/);
    assert.match(withAudio, /atempo=1\.25/);

    const silent = buildCanvasFfmpegArgs(
      "ffmpeg:trim-speed",
      { ffmpegSpeed: 1.5 },
      { videoFiles: ["in.mp4"], hasAudioByVideo: [false] },
      "out.mp4",
    ).join(" ");
    assert.match(silent, /setpts=PTS\/1\.5/);
    assert.doesNotMatch(silent, /atempo/);
  });

  it("builds ffmpeg:transform args for 9:16, 16:9, and 1:1", () => {
    const portraitCrop = buildCanvasFfmpegArgs(
      "ffmpeg:transform",
      { aspectRatio: "9:16", ffmpegCropMode: "center-crop" },
      { videoFiles: ["in.mp4"], hasAudioByVideo: [true] },
      "out.mp4",
    ).join(" ");
    assert.match(portraitCrop, /1080:1920/);
    assert.match(portraitCrop, /crop=1080:1920/);

    const landscapePad = buildCanvasFfmpegArgs(
      "ffmpeg:transform",
      { aspectRatio: "16:9", ffmpegCropMode: "fit-pad" },
      { videoFiles: ["in.mp4"], hasAudioByVideo: [true] },
      "out.mp4",
    ).join(" ");
    assert.match(landscapePad, /pad=1920:1080/);

    const squareCrop = buildCanvasFfmpegArgs(
      "ffmpeg:transform",
      { aspectRatio: "1:1", ffmpegCropMode: "center-crop" },
      { videoFiles: ["in.mp4"], hasAudioByVideo: [true] },
      "out.mp4",
    ).join(" ");
    assert.match(squareCrop, /1080:1080/);
  });
});

describe("canvas ffmpeg ops — worker execution", () => {
  it("fails ffmpeg:extract-audio cleanly when source video has no audio stream", async () => {
    const jobId = new ObjectId();
    const canvasId = new ObjectId();
    let updatedStatus = "";
    let updatedError = "";

    const res = await executeCanvasFfmpegJob(jobId, {
      findCanvasJob: async () => ({
        _id: jobId,
        clerkUserId: "user-1",
        canvasId,
        nodeId: "n1",
        provider: "ffmpeg",
        modelId: "ffmpeg:extract-audio",
        providerModelId: "extract-audio",
        status: "queued",
        domainKind: "worker_ffmpeg",
        inputSnapshot: { video: "https://blob.example/silent.mp4" },
        chargedUsd: 0,
        outputKind: "audio",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      downloadToFile: async () => {},
      probeStderr: async () => "Stream #0:0: Video: h264, yuv420p, 1080x1920",
      runFfmpeg: async () => {},
      updateCanvasJob: async (_id, _uid, update) => {
        if (update.$set?.status) updatedStatus = update.$set.status;
        if (update.$set?.error) updatedError = update.$set.error;
      },
      updateCanvasNodeState: async () => {},
    });

    assert.equal(res.outcome, "failed");
    assert.match(res.error, /音訊|audio/i);
    assert.equal(updatedStatus, "failed");
    assert.match(updatedError, /音訊|audio/i);
  });
});

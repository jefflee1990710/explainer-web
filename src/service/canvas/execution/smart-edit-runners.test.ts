import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanSpeechVideo, keepRangesArgs } from "@/service/canvas/execution/clean-speech";
import { smartReframeVideo } from "@/service/canvas/execution/smart-reframe";
import { DEFAULT_SPEECH_CUT_OPTIONS } from "@/service/canvas/core/speech-cuts";

const probeText = (sec: number, size = "1920x1080", audio = true) =>
  [
    `  Duration: 00:00:${sec.toFixed(2).padStart(5, "0")}, start: 0.000000, bitrate: 900 kb/s`,
    `  Stream #0:0(und): Video: h264 (High), yuv420p, ${size}, 30 fps`,
    ...(audio ? ["  Stream #0:1(und): Audio: aac (LC), 44100 Hz, stereo, fltp"] : []),
  ].join("\n");

// Fake ffmpeg: writes whatever file the last argument (or the frame pattern) names.
function fakeRun(calls: string[][]) {
  return async (dir: string, args: string[]) => {
    calls.push(args);
    const out = args.at(-1)!;
    if (out.includes("%02d")) {
      for (let i = 1; i <= 3; i += 1) await writeFile(join(dir, out.replace("%02d", String(i).padStart(2, "0"))), "jpg");
    } else {
      await writeFile(join(dir, out), "data");
    }
  };
}

const common = {
  downloadToFile: async (_url: string, dest: string) => writeFile(dest, "mp4"),
  persist: async (_b: Buffer, pathname: string) => `https://blob.test/${pathname}`,
};

describe("cleanSpeechVideo", () => {
  it("transcribes, cuts the filler, and renders the kept ranges", async () => {
    const calls: string[][] = [];
    const result = await cleanSpeechVideo(
      { videoUrl: "https://blob.test/in.mp4", language: "en", options: DEFAULT_SPEECH_CUT_OPTIONS, pathname: "canvas/x.mp4" },
      {
        ...common,
        probe: async (_dir, file) => probeText(file === "in.mp4" ? 3 : 2.5),
        run: fakeRun(calls),
        transcribe: async () => ({
          words: [
            { text: "Hello", start: 0, end: 0.5, type: "word" },
            { text: "uh", start: 0.6, end: 1.1, type: "word" },
            { text: "world", start: 1.2, end: 2.9, type: "word" },
          ],
        }),
      },
    );
    assert.equal(result.outputUrl, "https://blob.test/canvas/x.mp4");
    assert.equal(result.cutCount, 1);
    assert.equal(result.outputMeta?.durationSec, 2.5);
    assert.equal(calls.length, 2);
    assert.ok(calls[1]!.join(" ").includes("concat=n=2:v=1:a=1"));
  });

  it("returns the source unchanged when nothing needs cutting", async () => {
    const calls: string[][] = [];
    const result = await cleanSpeechVideo(
      { videoUrl: "https://blob.test/in.mp4", language: "en", options: DEFAULT_SPEECH_CUT_OPTIONS, pathname: "p.mp4" },
      {
        ...common,
        probe: async () => probeText(1),
        run: fakeRun(calls),
        transcribe: async () => ({ words: [{ text: "Hi", start: 0, end: 0.9, type: "word" }] }),
      },
    );
    assert.equal(result.outputUrl, "https://blob.test/in.mp4");
    assert.equal(result.cutCount, 0);
    assert.equal(calls.length, 1);
  });

  it("fails on a silent video", async () => {
    await assert.rejects(
      cleanSpeechVideo(
        { videoUrl: "https://blob.test/in.mp4", language: "en", options: DEFAULT_SPEECH_CUT_OPTIONS, pathname: "p.mp4" },
        { ...common, probe: async () => probeText(1, "1920x1080", false), run: fakeRun([]), transcribe: async () => ({ words: [] }) },
      ),
      /沒有音訊/,
    );
  });

  it("builds silent tracks for sources without audio", () => {
    const args = keepRangesArgs([{ start: 0, end: 1 }], false, "o.mp4").join(" ");
    assert.match(args, /anullsrc=r=44100:cl=stereo:d=1\.000\[a0\]/);
  });
});

describe("smartReframeVideo", () => {
  it("locates the subject on sampled frames and renders a following crop", async () => {
    const calls: string[][] = [];
    let framesSeen = 0;
    const result = await smartReframeVideo(
      { videoUrl: "https://blob.test/in.mp4", aspect: "9:16", resolution: "720p", motion: "follow", focus: "", pathname: "r.mp4" },
      {
        ...common,
        probe: async (_dir, file) => (file === "in.mp4" ? probeText(3) : probeText(3, "720x1280")),
        run: fakeRun(calls),
        locateSubjects: async (frames) => {
          framesSeen = frames.length;
          return [{ x: 0.2, y: 0.5 }, null, { x: 0.8, y: 0.5 }];
        },
      },
    );
    assert.equal(framesSeen, 3);
    assert.equal(result.outputMeta?.width, 720);
    assert.match(result.report, /1920×1080 → 720×1280/);
    assert.match(result.report, /2\/3 frames/);
    const render = calls[1]!.join(" ");
    assert.match(render, /crop=606:1080:if\(lt\(t\\,/);
    assert.match(render, /scale=720:1280/);
  });

  it("falls back to center framing when the vision call fails", async () => {
    const calls: string[][] = [];
    await smartReframeVideo(
      { videoUrl: "https://blob.test/in.mp4", aspect: "1:1", resolution: "720p", motion: "steady", focus: "", pathname: "r.mp4" },
      {
        ...common,
        probe: async () => probeText(2),
        run: fakeRun(calls),
        locateSubjects: async () => {
          throw new Error("gemini down");
        },
      },
    );
    assert.match(calls[1]!.join(" "), /crop=1080:1080:420:0,scale=720:720/);
  });
});

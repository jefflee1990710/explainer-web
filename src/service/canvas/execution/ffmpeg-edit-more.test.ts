import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exportFileSlug, exportFormat, textOverlayAss } from "@/service/canvas/execution/ffmpeg-edit-more";
import { atempoChain, buildCanvasFfmpegArgs, type CanvasFfmpegLocalInputs } from "@/service/canvas/execution/ffmpeg-ops";
import { resolveSubtitleFont } from "@/service/canvas/execution/edit-fonts";
import { complementRanges } from "@/service/canvas/core/edit-ranges";
import { extraOutputPathname, extraOutputUrl } from "@/service/canvas/core/extra-outputs";
import { subtitleAlignment, subtitleAssStyle } from "@/service/canvas/core/subtitle-look-styles";
import { cuesToAss } from "@/service/canvas/core/captions";

const one = (over: Partial<CanvasFfmpegLocalInputs> = {}): CanvasFfmpegLocalInputs => ({
  videoFiles: ["in.mp4"],
  hasAudioByVideo: [true],
  durationsSec: [10],
  ...over,
});
const args = (modelId: string, params: Record<string, unknown>, local = one(), out = "out.mp4") =>
  buildCanvasFfmpegArgs(modelId, params, local, out).join(" ");

describe("newer edit node args", () => {
  it("split writes part A and part B in one run", () => {
    const a = args("ffmpeg:split", { ffmpegAtSec: 4 }, one(), "/tmp/j/out.mp4");
    assert.match(a, /\[va\]trim=end=4\.000/);
    assert.match(a, /\[vb\]trim=start=4\.000/);
    assert.match(a, /\/tmp\/j\/out-video-b\.mp4/);
    assert.throws(() => args("ffmpeg:split", { ffmpegAtSec: 12 }), /./);
  });

  it("audio-mix loops, delays, ducks, and keeps the video length", () => {
    const a = args("ffmpeg:audio-mix", { ffmpegBgmStartSec: 2, ffmpegBgmVolumeDb: -20 }, one({ audioFile: "bgm.mp3" }));
    assert.match(a, /-stream_loop -1/);
    assert.match(a, /adelay=2000/);
    assert.match(a, /sidechaincompress/);
    assert.match(a, /-t 10/);
    const plain = args("ffmpeg:audio-mix", { ffmpegBgmLoop: false, ffmpegBgmDuck: false }, one({ audioFile: "bgm.mp3" }));
    assert.doesNotMatch(plain, /stream_loop|sidechaincompress/);
  });

  it("audio-trim and audio-concat write audio", () => {
    const t = args("ffmpeg:audio-trim", { ffmpegStartSec: 1, ffmpegEndSec: 3, ffmpegLoudnorm: true }, one({ videoFiles: [], audioFile: "a.mp3", audioDurationSec: 5 }), "o.mp3");
    assert.match(t, /atrim=start=1\.000:end=3\.000/);
    assert.match(t, /loudnorm/);
    const c = args("ffmpeg:audio-concat", { ffmpegGapSec: 0.5 }, one({ videoFiles: [], audioFiles: ["a.mp3", "b.mp3"] }), "o.mp3");
    assert.match(c, /concat=n=\d+:v=0:a=1/);
  });

  it("adjust maps warm K to a low colortemperature and adds a vignette", () => {
    const a = args("ffmpeg:adjust", { ffmpegTemperatureK: 9000, ffmpegSaturation: 0.5, ffmpegVignette: true });
    assert.match(a, /colortemperature=temperature=4000/);
    assert.match(a, /saturation=0\.5/);
    assert.match(a, /vignette/);
  });

  it("freeze holds a frame and pads the sound", () => {
    const a = args("ffmpeg:freeze", { ffmpegAtSec: 3, ffmpegDurationSec: 2 });
    assert.match(a, /tpad=stop_mode=clone:stop_duration=2/);
    assert.match(a, /anullsrc|apad|adelay/);
  });

  it("export picks codec and container by format", () => {
    assert.match(args("ffmpeg:export", { ffmpegFormat: "webm" }, one(), "o.webm"), /libvpx-vp9/);
    assert.match(args("ffmpeg:export", { ffmpegFormat: "gif" }, one(), "o.gif"), /palettegen/);
    assert.match(args("ffmpeg:export", { ffmpegQuality: "high", ffmpegFps: "30" }, one(), "o.mp4"), /-crf 18.*fps=30|fps=30.*-crf 18/);
    assert.equal(exportFormat({ ffmpegFormat: "bogus" }), "mp4");
    assert.equal(exportFileSlug({ ffmpegFileName: "My Reel!.mp4" }), "My-Reel");
  });

  it("concat uses any xfade transition, capped by clip length, and reframes", () => {
    const a = args("ffmpeg:concat", { ffmpegTransition: "wipeleft", ffmpegTransitionSec: 1.5, ffmpegAspect: "16:9" }, one({ videoFiles: ["a.mp4", "b.mp4"], hasAudioByVideo: [true, true], durationsSec: [6, 2] }));
    assert.match(a, /xfade=transition=wipeleft:duration=1\.000:offset=5\.000/);
    assert.match(a, /scale=1920:1080/);
    // fps after setpts keeps a constant frame rate for xfade.
    assert.match(a, /setpts=PTS-STARTPTS,scale=.*fps=30/);
  });

  it("trim-speed reverses and chains atempo past 2x", () => {
    const a = args("ffmpeg:trim-speed", { ffmpegSpeed: 4, ffmpegReverse: true });
    assert.match(a, /reverse/);
    assert.match(a, /areverse/);
    assert.equal(atempoChain(4), "atempo=2,atempo=2");
    assert.equal(atempoChain(0.25), "atempo=0.5,atempo=0.5");
    assert.equal(atempoChain(1.5), "atempo=1.5");
  });

  it("keep-ranges remove mode keeps the gaps between", () => {
    assert.deepEqual(complementRanges([{ start: 2, end: 4 }], 10), [
      { start: 0, end: 2 },
      { start: 4, end: 10 },
    ]);
    assert.match(args("ffmpeg:keep-ranges", { ffmpegRanges: "2-4", ffmpegRangeMode: "remove" }), /trim=start=0:end=2.*trim=start=4:end=10/);
  });

  it("overlay keys green and places by percent", () => {
    const a = args("ffmpeg:overlay", { ffmpegOverlayPosition: "custom", ffmpegOverlayX: 10, ffmpegOverlayY: 60, ffmpegChromaKey: "green", ffmpegOverlayStartSec: 1, ffmpegOverlayEndSec: 3 }, one({ overlayVideoFile: "o.mp4" }));
    assert.match(a, /chromakey=0x00FF00/i);
    assert.match(a, /main_w\*0\.1000:main_h\*0\.6000.*enable='between\(t,1\.000,3\.000\)'/);
  });
});

describe("edit helpers", () => {
  it("derives extra output urls next to the main file", () => {
    assert.equal(extraOutputUrl("https://b.example/canvas/u/j.mp4?x=1", "video-b"), "https://b.example/canvas/u/j-video-b.mp4?x=1");
    assert.equal(extraOutputPathname("/tmp/out.mp4", "video-b"), "/tmp/out-video-b.mp4");
  });

  it("styles subtitles by look and position", () => {
    assert.equal(subtitleAlignment("top"), 8);
    assert.equal(subtitleAlignment("middle"), 5);
    assert.equal(subtitleAlignment("bottom"), 2);
    assert.equal(subtitleAssStyle("nope"), subtitleAssStyle("clean"));
    const ass = cuesToAss([{ start: 0, end: 1, text: "hi" }], 720, 1280, "Noto Sans CJK TC", {
      style: subtitleAssStyle("neon"),
      alignment: 8,
    });
    assert.match(ass, /Style: Default,Noto Sans CJK TC/);
    assert.match(ass, /,8,/);
  });

  it("draws the Text node as an ASS event with the chosen window", { skip: !resolveSubtitleFont() }, () => {
    const ass = textOverlayAss({ ffmpegText: "開場\\n第二行", ffmpegTextStartSec: 1, ffmpegTextEndSec: 3, ffmpegTextBox: true }, one());
    assert.match(ass, /Dialogue: 0,0:00:01\.00,0:00:03\.00/);
    assert.match(ass, /開場\\N第二行/);
  });
});

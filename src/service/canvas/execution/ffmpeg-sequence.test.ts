import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasSequenceSchema } from "@/model/canvas-sequence";
import { buildSequenceFfmpegArgs, type SequenceLocalInputs } from "@/service/canvas/execution/ffmpeg-sequence";

const filterOf = (args: string[]) => args[args.indexOf("-filter_complex") + 1]!;

const local = (extra: Partial<SequenceLocalInputs> = {}): SequenceLocalInputs => ({
  sources: {
    e1: { file: "a.mp4", kind: "video", durationSec: 6, hasAudio: true },
    e2: { file: "b.mp4", kind: "video", durationSec: 4, hasAudio: false },
    e3: { file: "logo.png", kind: "image" },
    e4: { file: "bgm.mp3", kind: "audio", durationSec: 3 },
  },
  textFiles: {},
  ...extra,
});

describe("buildSequenceFfmpegArgs", () => {
  it("concats cuts in one run and seeks each clip on the input side", () => {
    const seq = canvasSequenceSchema.parse({
      aspectRatio: "16:9",
      resolution: "720p",
      tracks: { video: [{ id: "a", ref: "e1", inSec: 1, outSec: 3 }, { id: "b", ref: "e2" }] },
    });
    const args = buildSequenceFfmpegArgs(seq, local(), "out.mp4");
    assert.deepEqual(args.slice(0, 7), ["-y", "-ss", "1", "-t", "2", "-i", "a.mp4"]);
    const f = filterOf(args);
    assert.match(f, /scale=1280:720:force_original_aspect_ratio=decrease/);
    assert.match(f, /anullsrc=r=48000:cl=stereo,atrim=duration=4\[ca1\]/);
    assert.match(f, /\[cv0\]\[ca0\]\[cv1\]\[ca1\]concat=n=2:v=1:a=1/);
    assert.doesNotMatch(f, /xfade/);
    assert.deepEqual(args.slice(-3), ["-t", "6", "out.mp4"]);
  });

  it("crossfades at the incoming clip's timeline start and chains atempo for speed", () => {
    const seq = canvasSequenceSchema.parse({
      tracks: {
        video: [
          { id: "a", ref: "e1", speed: 4 },
          { id: "b", ref: "e2", transitionIn: { effect: "slideleft", durationSec: 0.5 } },
        ],
      },
    });
    const f = filterOf(buildSequenceFfmpegArgs(seq, local(), "out.mp4"));
    assert.match(f, /setpts=\(PTS-STARTPTS\)\/4/);
    assert.match(f, /atempo=2,atempo=2/);
    assert.match(f, /xfade=transition=slideleft:duration=0\.5:offset=1/);
    assert.match(f, /acrossfade=d=0\.5/);
  });

  it("layers an image in its window, text and captions, and ducked looped music", () => {
    const seq = canvasSequenceSchema.parse({
      tracks: {
        video: [{ id: "a", ref: "e1" }],
        overlay: [
          { id: "l", kind: "image", ref: "e3", startSec: 1, endSec: 2, opacity: 0.5, scalePct: 20 },
          { id: "t", kind: "text", text: "Hi" },
        ],
        audio: [{ id: "m", ref: "e4", startSec: 1, gainDb: -6, duck: true, loop: true, fadeOutSec: 1 }],
      },
    });
    const args = buildSequenceFfmpegArgs(
      seq,
      local({ textFiles: { t: "t.ass" }, captionsFile: "c.ass", fontsDir: "/fonts" }),
      "out.mp4",
    );
    assert.ok(args.join(" ").includes("-loop 1 -t 6 -i logo.png"));
    assert.ok(args.join(" ").includes("-stream_loop -1 -i bgm.mp3"));
    const f = filterOf(args);
    assert.match(f, /scale=216:-2,format=rgba,colorchannelmixer=aa=0\.5/);
    assert.match(f, /enable='between\(t,1,2\)'/);
    assert.match(f, /subtitles=t\.ass:fontsdir=\/fonts\[tv0\];\[tv0\]subtitles=c\.ass/);
    assert.match(f, /atrim=duration=5,volume=-6dB,afade=t=out:st=4:d=1,adelay=1000:all=1/);
    assert.match(f, /sidechaincompress/);
    assert.match(f, /amix=inputs=2:duration=first:normalize=0\[mix\]/);
  });

  it("fails clearly on an unwired clip, an unknown length, and the 4K cap", () => {
    const missing = canvasSequenceSchema.parse({ tracks: { video: [{ id: "a", ref: "gone" }] } });
    assert.throws(() => buildSequenceFfmpegArgs(missing, local(), "o.mp4"), /沒有連接影片/);
    const unknown = canvasSequenceSchema.parse({ tracks: { video: [{ id: "a", ref: "e1" }] } });
    const noLen = local();
    noLen.sources.e1 = { file: "a.mp4", kind: "video", hasAudio: true };
    assert.throws(() => buildSequenceFfmpegArgs(unknown, noLen, "o.mp4"), /無法讀取/);
    const big = canvasSequenceSchema.parse({ resolution: "4k", tracks: { video: [{ id: "a", ref: "e1" }] } });
    const long = local();
    long.sources.e1 = { file: "a.mp4", kind: "video", durationSec: 400, hasAudio: true };
    assert.throws(() => buildSequenceFfmpegArgs(big, long, "o.mp4"), /4K/);
  });
});

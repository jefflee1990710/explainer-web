import assert from "node:assert/strict";
import test from "node:test";
import { parseSpeechWindowFromStderr } from "@/service/voice/elevenlabs";
import { smoothSilenceCut, smoothSilenceTrimArgs } from "@/service/voice/smooth-silence";

test("smoothSilenceCut keeps a breath and drops the rest of the dead air", () => {
  const cut = smoothSilenceCut({ duration: 5, start: 0.5, end: 4.1 });
  assert.ok(cut);
  assert.equal(cut.startSeconds, 0.28);
  assert.equal(cut.durationSeconds, 4.14);
});

test("smoothSilenceCut leaves a clip that is already tight", () => {
  assert.equal(smoothSilenceCut({ duration: 5, start: 0.1, end: 4.85 }), null);
  assert.equal(smoothSilenceCut({ duration: 5, start: 0, end: 5 }), null);
  assert.equal(smoothSilenceCut({ duration: 0.4, start: 0.2, end: 0.3 }), null);
});

test("smoothSilenceCut reads a silencedetect window the same way voice swap does", () => {
  const stderr = `
  Duration: 00:00:05.17, start: 0.000000, bitrate: 5559 kb/s
  [silencedetect @ 0x1] silence_start: 0
  [silencedetect @ 0x1] silence_end: 0.885281 | silence_duration: 0.885281
  [silencedetect @ 0x1] silence_start: 4.603562
  [silencedetect @ 0x1] silence_end: 5.17 | silence_duration: 0.566438
  `;
  const win = parseSpeechWindowFromStderr(stderr);
  const cut = smoothSilenceCut(win);
  assert.ok(cut);
  assert.equal(cut.startSeconds, 0.665);
  assert.equal(cut.durationSeconds, 4.259);
});

test("smoothSilenceTrimArgs fades the kept span so the cut does not click", () => {
  const args = smoothSilenceTrimArgs("in.mp4", "out.mp4", {
    startSeconds: 0.28,
    durationSeconds: 4.14,
  });
  assert.match(args.join(" "), /trim=start=0\.28:end=4\.42,setpts=PTS-STARTPTS,setsar=1/);
  assert.match(args.join(" "), /atrim=start=0\.28:end=4\.42/);
  assert.match(args.join(" "), /afade=t=in:st=0:d=0\.015/);
  assert.match(args.join(" "), /afade=t=out:st=4\.125:d=0\.015/);
});

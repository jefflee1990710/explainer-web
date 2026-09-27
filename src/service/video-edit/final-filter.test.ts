import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFinalFilter } from "@/service/video-edit/final-filter";

const frame = { width: 1080, height: 1920, fps: 30 };
const main = { durationSec: 12, hasAudio: true };
const logo = (index: number) => ({
  index,
  placement: { anchor: "top-right" as const, w: 216, margin: 43 },
  opacity: 0.8,
});

test("layers only: overlays on the main reel, one segment", () => {
  const { filter, hasAudio } = buildFinalFilter({ ...frame, main, layers: [logo(1)] });
  assert.equal(hasAudio, true);
  assert.match(filter, /\[1:v\]scale=216:-2,format=rgba,colorchannelmixer=aa=0\.8\[l0\]/);
  assert.match(filter, /\[m0\]\[l0\]overlay=x=main_w-overlay_w-43:y=43\[m1\]/);
  assert.match(filter, /concat=n=1:v=1:a=1\[v\]\[a\]/);
  assert.doesNotMatch(filter, /fade=t=/);
});

test("several layers stack in array order", () => {
  const { filter } = buildFinalFilter({ ...frame, main, layers: [logo(1), logo(2)] });
  assert.match(filter, /\[m0\]\[l0\]overlay=.*\[m1\]/);
  assert.match(filter, /\[m1\]\[l1\]overlay=.*\[m2\]/);
});

test("image intro is cropped to the frame, gets silent audio, and fades into the main", () => {
  const { filter } = buildFinalFilter({
    ...frame,
    main,
    layers: [],
    intro: { index: 1, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.match(filter, /\[1:v\]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(filter, /anullsrc=r=44100:cl=stereo,atrim=0:2/);
  assert.match(filter, /fade=t=out:st=1\.9:d=0\.1/);
  assert.match(filter, /concat=n=2:v=1:a=1/);
});

test("intro and outro wrap the main in order", () => {
  const { filter } = buildFinalFilter({
    ...frame,
    main,
    layers: [logo(2)],
    intro: { index: 1, kind: "video", durationSec: 3, hasAudio: true },
    outro: { index: 3, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.match(filter, /\[1:a\]aformat=/);
  assert.match(filter, /\[3:v\]scale=1080:1920/);
  assert.match(filter, /\[s0v\]\[s0a\]\[s1v\]\[s1a\]\[s2v\]\[s2a\]concat=n=3:v=1:a=1\[v\]\[a\]/);
});

test("no audio anywhere: video-only concat", () => {
  const { filter, hasAudio } = buildFinalFilter({
    ...frame,
    main: { durationSec: 5, hasAudio: false },
    layers: [],
    outro: { index: 1, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.equal(hasAudio, false);
  assert.doesNotMatch(filter, /anullsrc|aformat/);
  assert.match(filter, /concat=n=2:v=1:a=0\[v\]/);
});

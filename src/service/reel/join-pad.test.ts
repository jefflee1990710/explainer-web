import assert from "node:assert/strict";
import { test } from "node:test";
import { joinPadArgs } from "@/service/reel/join-pad";

const VIDEO = "Stream #0:0: Video: h264, yuv420p, 64x64, 25 fps, 25 tbr";

test("a silent clip pads video only", () => {
  const args = joinPadArgs("left.mp4", "pad.mp4", VIDEO);
  assert.equal(args.includes("-an"), true);
  assert.match(args.join(" "), /tpad=stop_mode=clone:stop_duration=0.2/);
  assert.equal(args.at(-1), "pad.mp4");
});

test("a clip with audio also pads silence in the same layout", () => {
  const args = joinPadArgs("left.mp4", "pad.mp4", `${VIDEO}\nStream #0:1: Audio: aac, 44100 Hz, stereo`);
  assert.match(args.join(" "), /anullsrc=r=44100:cl=stereo/);
  assert.equal(args.includes("-an"), false);
});

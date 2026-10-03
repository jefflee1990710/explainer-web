import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClipConcatFilter } from "@/service/video-edit/clip-concat-filter";

test("one clip needs no concat filter", () => {
  assert.equal(buildClipConcatFilter(1, true), "");
});

test("two clips concat video and audio", () => {
  const filter = buildClipConcatFilter(2, true);
  assert.match(filter, /concat=n=2:v=1:a=1\[v\]\[a\]/);
  assert.match(filter, /\[0:v]/);
  assert.match(filter, /\[1:a]/);
});

test("clips without audio concat video only", () => {
  assert.match(buildClipConcatFilter(3, false), /concat=n=3:v=1:a=0\[v\]/);
});

test("fade between clips uses xfade with the overlap offset", () => {
  const filter = buildClipConcatFilter(2, true, [5, 4], [{ effect: "fade", durationSec: 0.5 }]);
  assert.match(filter, /xfade=transition=fade:duration=0\.5:offset=4\.5/);
  assert.match(filter, /acrossfade=d=0\.5/);
});

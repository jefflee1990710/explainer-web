import assert from "node:assert/strict";
import test from "node:test";
import {
  audioGainAt,
  clipStarts,
  drawLayersAt,
  fadeSeconds,
  mixClipPcm,
} from "@/service/video-edit/hardware-composite";
import { layerPixelBox } from "@/service/video-edit/layer-placement";

const fade = { effect: "fade" as const, durationSec: 0.5 };

test("a fade overlaps the clips and shortens the timeline by the fade", () => {
  const { starts, duration } = clipStarts([5, 5], [fade]);
  assert.deepEqual(starts, [0, 4.5]);
  assert.equal(duration, 9.5);
  assert.equal(fadeSeconds(fade, 5), 0.5);
  assert.equal(fadeSeconds(fade, 0.4), 0.2);
  assert.equal(fadeSeconds({ effect: "none", durationSec: 0.5 }, 5), 0);
});

test("fade frames crossfade, and a wipe or slide moves the incoming picture", () => {
  const before = drawLayersAt(1, [5, 5], [fade]);
  assert.deepEqual(before.map((layer) => layer.clip), [0]);
  const mid = drawLayersAt(4.75, [5, 5], [fade]);
  assert.equal(mid.length, 2);
  assert.equal(mid[0].alpha, 0.5);
  assert.equal(mid[1].alpha, 0.5);
  assert.equal(mid[1].time, 0.25);

  const wipe = drawLayersAt(4.75, [5, 5], [{ effect: "wipeleft", durationSec: 0.5 }]);
  assert.equal(wipe[0].alpha, 1);
  assert.deepEqual(wipe[1].window, { x: 0.5, y: 0, w: 0.5, h: 1 });

  const slide = drawLayersAt(4.75, [5, 5], [{ effect: "slideleft", durationSec: 0.5 }]);
  assert.equal(slide[0].dx, -0.5);
  assert.equal(slide[1].dx, 0.5);
});

test("audio crossfades to half at the middle of the overlap", () => {
  assert.equal(audioGainAt(4.75, 0, [5, 5], [fade]), 0.5);
  assert.equal(audioGainAt(4.75, 1, [5, 5], [fade]), 0.5);
  const tone = new Float32Array(5 * 8);
  tone.fill(1);
  const silence = new Float32Array(5 * 8);
  const mixed = mixClipPcm({
    clips: [
      { sampleRate: 8, channels: [tone] },
      { sampleRate: 8, channels: [silence] },
    ],
    durations: [5, 5],
    transitions: [fade],
    outputRate: 8,
  });
  // 4.75s * 8Hz = sample 38, halfway down from 1 toward 0.
  assert.ok(Math.abs(mixed.channels[0][38] - 0.5) < 0.02);
  assert.equal(mixed.channels[0].length, Math.round(9.5 * 8));
});

test("a logo box keeps the image aspect and the anchored corner", () => {
  assert.deepEqual(layerPixelBox({ anchor: "top-right", w: 216, margin: 43 }, 1080, 1920, 100, 50), {
    x: 821,
    y: 43,
    w: 216,
    h: 108,
  });
});

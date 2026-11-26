import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasSequenceSchema } from "@/model/canvas-sequence";
import {
  addTextLayer,
  fitZoomIndex,
  formatSec,
  reorderClips,
  resizeLayer,
  shiftWindow,
  trimClip,
} from "@/app/app/canvas/timeline/sequence-timeline-model";

const seq = canvasSequenceSchema.parse({
  tracks: {
    video: [
      { id: "a", ref: "e1" },
      { id: "b", ref: "e2", transitionIn: { effect: "fade", durationSec: 0.5 } },
    ],
  },
});

describe("sequence timeline edits", () => {
  it("formats seconds as m:ss.s", () => {
    assert.equal(formatSec(65.25), "1:05.3");
    assert.equal(formatSec(undefined), "--");
  });

  it("drops the join on whichever clip becomes first", () => {
    const next = reorderClips(seq, 1, 0);
    assert.deepEqual(next.tracks.video.map((c) => c.id), ["b", "a"]);
    assert.equal(next.tracks.video[0]!.transitionIn, undefined);
  });

  it("trims in source seconds, scaled by speed, inside the source", () => {
    const clip = { ...seq.tracks.video[0]!, speed: 2 };
    assert.deepEqual(trimClip(clip, "in", 1, 10), { inSec: 2 });
    assert.deepEqual(trimClip(clip, "out", -1, 10), { outSec: 8 });
    assert.deepEqual(trimClip(clip, "out", 5, 10), { outSec: 10 });
    assert.deepEqual(trimClip(clip, "in", -3, 10), { inSec: 0 });
  });

  it("moves and resizes layer windows inside the timeline", () => {
    assert.deepEqual(shiftWindow({ startSec: 1, endSec: 3 }, 10, 8), { startSec: 6, endSec: 8 });
    assert.deepEqual(shiftWindow({ startSec: 1 }, -5, 8), { startSec: 0 });
    const layer = addTextLayer(seq, 2, "Hi", 8);
    const added = layer.seq.tracks.overlay[0]!;
    assert.deepEqual([added.kind, added.startSec, added.endSec, added.text], ["text", 2, 5, "Hi"]);
    assert.deepEqual(resizeLayer(added, "end", 10, 8), { endSec: 8 });
    assert.deepEqual(resizeLayer(added, "start", 4, 8), { startSec: 4.8 });
  });

  it("fits the whole timeline into the pane, falling back to the smallest zoom", () => {
    const zooms = [8, 15, 25, 40];
    assert.equal(fitZoomIndex(zooms, 600, 9.4, 80), 3);
    assert.equal(fitZoomIndex(zooms, 300, 120, 80), 0);
  });
});

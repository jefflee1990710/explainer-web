import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeClipRangeDragUpdate,
  detectClipRangeDragMode,
  resolveRangeTrackMaxDuration,
} from "@/service/jutsu/clip-range-selector";

describe("clip-range-selector", () => {
  it("resolves track maxDuration from actual sourceDuration when known", () => {
    assert.equal(resolveRangeTrackMaxDuration(9, 0, 9), 9);
    assert.equal(resolveRangeTrackMaxDuration(24, 2, 6), 24);
    assert.equal(resolveRangeTrackMaxDuration(0, 0, 6), 15);
  });

  it("detects start handle, end handle, and center move modes along the bar", () => {
    // Selection is 2s..8s on a 10s timeline (0.20 .. 0.80)
    assert.equal(
      detectClipRangeDragMode({
        ratio: 0.21,
        sectionStart: 2,
        sectionLength: 6,
        maxDuration: 10,
      }),
      "start",
    );
    assert.equal(
      detectClipRangeDragMode({
        ratio: 0.79,
        sectionStart: 2,
        sectionLength: 6,
        maxDuration: 10,
      }),
      "end",
    );
    assert.equal(
      detectClipRangeDragMode({
        ratio: 0.5,
        sectionStart: 2,
        sectionLength: 6,
        maxDuration: 10,
      }),
      "move",
    );
  });

  it("moves the whole selection window while keeping length constant in move mode", () => {
    const movedRight = computeClipRangeDragUpdate({
      mode: "move",
      deltaSec: 3.5,
      pointerSec: 6.5,
      initialStart: 1,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(movedRight, {
      sectionStart: 4.5,
      sectionLength: 6,
      previewTime: 4.5,
    });

    // Clamps at right edge of timeline (12 - 6 = 6)
    const clampedRight = computeClipRangeDragUpdate({
      mode: "move",
      deltaSec: 9,
      pointerSec: 11,
      initialStart: 1,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(clampedRight, {
      sectionStart: 6,
      sectionLength: 6,
      previewTime: 6,
    });

    // Clamps at left edge (0)
    const clampedLeft = computeClipRangeDragUpdate({
      mode: "move",
      deltaSec: -5,
      pointerSec: 0,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(clampedLeft, {
      sectionStart: 0,
      sectionLength: 6,
      previewTime: 0,
    });
  });

  it("shortens and lengthens from the left handle while anchoring the right end", () => {
    // Initial: start = 2, length = 6 (end = 8)
    // Drag left handle to 4s -> start = 4, length = 4 (end stays 8)
    const shorter = computeClipRangeDragUpdate({
      mode: "start",
      deltaSec: 2,
      pointerSec: 4,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(shorter, {
      sectionStart: 4,
      sectionLength: 4,
      previewTime: 4,
    });

    // Drag left handle to 0.5s -> start = 0.5, length = 7.5 (end stays 8)
    const longer = computeClipRangeDragUpdate({
      mode: "start",
      deltaSec: -1.5,
      pointerSec: 0.5,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(longer, {
      sectionStart: 0.5,
      sectionLength: 7.5,
      previewTime: 0.5,
    });

    // Enforces minimum 2s length (end = 8 -> max start = 6)
    const minClamped = computeClipRangeDragUpdate({
      mode: "start",
      deltaSec: 5.5,
      pointerSec: 7.5,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(minClamped, {
      sectionStart: 6,
      sectionLength: 2,
      previewTime: 6,
    });
  });

  it("shortens and lengthens from the right handle while anchoring the left start", () => {
    // Initial: start = 2, length = 6 (end = 8)
    // Drag right handle to 10.5s -> start = 2, length = 8.5
    const longer = computeClipRangeDragUpdate({
      mode: "end",
      deltaSec: 2.5,
      pointerSec: 10.5,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(longer, {
      sectionStart: 2,
      sectionLength: 8.5,
      previewTime: 10.5,
    });

    // Drag right handle to 3s -> start = 2, length = 2 (clamped to minLength = 2)
    const minClamped = computeClipRangeDragUpdate({
      mode: "end",
      deltaSec: -5,
      pointerSec: 3,
      initialStart: 2,
      initialLength: 6,
      maxDuration: 12,
    });
    assert.deepEqual(minClamped, {
      sectionStart: 2,
      sectionLength: 2,
      previewTime: 4,
    });
  });
});

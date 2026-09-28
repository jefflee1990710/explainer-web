import assert from "node:assert/strict";
import { test } from "node:test";
import { frameTileFace } from "@/presentation/components/project/frame-tile-face";
import type { ClipFrame } from "@/model/project";

function frame(status: ClipFrame["status"]): ClipFrame {
  return { clipNumber: 1, position: "start", prompt: "p", status };
}

test("queued or pending scene shows the drawing indicator, even with no row", () => {
  assert.equal(frameTileFace(undefined, true, false), "drawing");
  assert.equal(frameTileFace(frame("queued"), false, false), "drawing");
  assert.equal(frameTileFace(frame("in_progress"), false, false), "drawing");
});

test("empty placeholder only when nothing is queued or drawing", () => {
  assert.equal(frameTileFace(undefined, false, false), "empty");
});

test("completed image hides the drawing indicator", () => {
  assert.equal(frameTileFace(frame("completed"), false, true), "image");
  assert.equal(frameTileFace(frame("completed"), true, true), "drawing");
});

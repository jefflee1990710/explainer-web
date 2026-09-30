import assert from "node:assert/strict";
import { test } from "node:test";
import { frameTileFace, isFrameTilePending } from "@/presentation/components/project/frame-tile-face";
import type { ClipFrame } from "@/model/project";

function frame(status: ClipFrame["status"], extra?: Partial<ClipFrame>): ClipFrame {
  return { clipNumber: 1, position: "start", prompt: "p", status, ...extra };
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

test("a finished start still is not pending just because the end is still drawing", () => {
  assert.equal(
    isFrameTilePending(frame("completed", { blobUrl: "https://blob/start" }), false),
    false,
  );
  assert.equal(isFrameTilePending(frame("queued"), false), true);
  assert.equal(isFrameTilePending(frame("in_progress"), false), true);
  assert.equal(isFrameTilePending(frame("completed"), false), true);
  assert.equal(isFrameTilePending(undefined, false), false);
  assert.equal(isFrameTilePending(frame("completed", { blobUrl: "https://blob/start" }), true), true);
});

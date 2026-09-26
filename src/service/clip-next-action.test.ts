import assert from "node:assert/strict";
import { test } from "node:test";
import { clipNextAction } from "@/service/clip-next-action";
import type { ClipStage, ClipState } from "@/service/clip-stage";

function state(stage: ClipStage, stale = { frames: false, video: false }): ClipState {
  return { clipNumber: 1, stage, stale };
}

test("generating stages are busy with no cost", () => {
  assert.equal(clipNextAction(state("frames_generating")).kind, "busy");
  assert.equal(clipNextAction(state("video_generating")).kind, "busy");
  assert.equal(clipNextAction(state("video_generating")).cost, 0);
});

test("no frames asks to draw both frames", () => {
  assert.deepEqual(clipNextAction(state("no_frames")), {
    kind: "frames",
    label: "畫這段畫格",
    hint: "先畫起始與結束兩張",
    cost: 2,
  });
});

test("failed frames retry the frames", () => {
  const action = clipNextAction(state("frames_failed"));
  assert.equal(action.kind, "frames");
  assert.equal(action.label, "重試畫格");
});

test("stale frames outrank a ready video", () => {
  const action = clipNextAction(state("video_ready", { frames: true, video: true }));
  assert.equal(action.kind, "frames");
  assert.equal(action.label, "重畫畫格");
});

test("ready frames ask for the video", () => {
  const action = clipNextAction(state("frames_ready"));
  assert.equal(action.kind, "video");
  assert.equal(action.cost, 1);
});

test("failed video retries the video", () => {
  assert.equal(clipNextAction(state("video_failed")).label, "重試產片");
});

test("stale video asks to redo the video", () => {
  const action = clipNextAction(state("video_ready", { frames: false, video: true }));
  assert.equal(action.kind, "video");
  assert.equal(action.label, "重產影片");
});

test("finished clip moves to the next unfinished clip, or is done", () => {
  assert.equal(clipNextAction(state("video_ready"), 3).kind, "next");
  assert.equal(clipNextAction(state("video_ready"), 3).label, "下一段 #3");
  assert.equal(clipNextAction(state("video_ready")).kind, "done");
});

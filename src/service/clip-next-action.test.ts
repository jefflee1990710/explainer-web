import assert from "node:assert/strict";
import { test } from "node:test";
import { FRAMES_COST, MIN_VIDEO_COST, videoCost } from "@/service/production-plan";
import { canQueueFrames, canRedrawFrames, clipNextAction } from "@/service/clip-next-action";
import type { ClipStage, ClipState } from "@/service/clip-stage";

function state(
  stage: ClipStage,
  stale = { frames: false, video: false },
  wait?: ClipState["wait"],
): ClipState {
  return { clipNumber: 1, stage, stale, wait };
}

test("can queue frames while a video is pending, but not while frames are drawing", () => {
  assert.equal(canQueueFrames(state("video_generating")), true);
  assert.equal(canQueueFrames(state("frames_ready")), true);
  assert.equal(canQueueFrames(state("frames_generating")), false);
  assert.equal(canRedrawFrames(state("video_generating"), true), true);
  assert.equal(canRedrawFrames(state("frames_generating"), true), false);
  assert.equal(canRedrawFrames(state("no_frames"), false), false);
});

test("generating stages are busy with no cost", () => {
  assert.equal(clipNextAction(state("frames_generating")).kind, "busy");
  assert.equal(clipNextAction(state("video_generating")).kind, "busy");
  assert.equal(clipNextAction(state("video_generating")).cost, 0);
});

test("busy hints distinguish queued from running", () => {
  const fresh = { frames: false, video: false };
  assert.equal(clipNextAction(state("frames_generating", fresh, "queued")).id, "busy.framesQueued");
  assert.equal(clipNextAction(state("frames_generating", fresh, "running")).id, "busy.framesRunning");
  assert.equal(clipNextAction(state("video_generating", fresh, "queued")).id, "busy.videoQueued");
  assert.equal(clipNextAction(state("video_generating", fresh, "running")).id, "busy.videoRunning");
});

test("no frames asks to draw both frames", () => {
  assert.deepEqual(clipNextAction(state("no_frames")), {
    kind: "frames",
    id: "drawFrames",
    cost: FRAMES_COST,
  });
});

test("failed frames retry the frames", () => {
  const action = clipNextAction(state("frames_failed"));
  assert.equal(action.kind, "frames");
  assert.equal(action.id, "retryFrames");
});

test("stale frames outrank a ready video", () => {
  const action = clipNextAction(state("video_ready", { frames: true, video: true }));
  assert.equal(action.kind, "frames");
  assert.equal(action.id, "staleFrames");
});

test("ready frames ask for the video at the clip's per-second cost", () => {
  const action = clipNextAction(state("frames_ready"));
  assert.equal(action.kind, "video");
  assert.equal(action.cost, MIN_VIDEO_COST);
  const eightSeconds = clipNextAction({ ...state("frames_ready"), videoCost: videoCost(8) });
  assert.equal(eightSeconds.cost, 72);
});

test("failed video retries the video", () => {
  assert.equal(clipNextAction(state("video_failed")).id, "retryVideo");
});

test("stale video asks to redo the video", () => {
  const action = clipNextAction(state("video_ready", { frames: false, video: true }));
  assert.equal(action.kind, "video");
  assert.equal(action.id, "redoVideo");
});

test("finished clip moves to the next unfinished clip, or is done", () => {
  assert.equal(clipNextAction(state("video_ready"), 3).kind, "next");
  assert.equal(clipNextAction(state("video_ready"), 3).id, "nextClip");
  assert.equal(clipNextAction(state("video_ready"), 3).params?.n, 3);
  assert.equal(clipNextAction(state("video_ready")).kind, "done");
});

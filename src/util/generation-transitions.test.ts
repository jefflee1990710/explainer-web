import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/model/project";
import { generationTransitions, transitionMessage } from "@/util/generation-transitions";

function frame(position: ClipFrame["position"], extra: Partial<ClipFrame> = {}): ClipFrame {
  return { clipNumber: 2, position, prompt: "", status: "queued", ...extra };
}

function clip(extra: Partial<ProjectClip> = {}): ProjectClip {
  return { clipNumber: 2, durationSeconds: 6, prompt: "", status: "queued", ...extra };
}

test("a queued still that lands with a file becomes a completed transition", () => {
  const prev = { frames: [frame("start")], clips: [] };
  const next = { frames: [frame("start", { status: "completed", blobUrl: "img" })], clips: [] };
  const [item] = generationTransitions(prev, next);
  assert.equal(item.kind, "frame");
  assert.equal(item.position, "start");
  assert.equal(item.outcome, "completed");
  assert.equal(item.mediaUrl, "img");
  assert.equal(transitionMessage(item), "Clip 2 · 起始畫格 完成");
});

test("completed without a file is not announced yet", () => {
  const prev = { frames: [frame("end")], clips: [] };
  const next = { frames: [frame("end", { status: "completed" })], clips: [] };
  assert.equal(generationTransitions(prev, next).length, 0);
});

test("a failed video carries its error into the message", () => {
  const prev = { frames: [], clips: [clip({ status: "in_progress" })] };
  const next = { frames: [], clips: [clip({ status: "failed", error: "NSFW" })] };
  const [item] = generationTransitions(prev, next);
  assert.equal(item.kind, "video");
  assert.equal(item.outcome, "failed");
  assert.equal(transitionMessage(item), "Clip 2 · 影片 失敗：NSFW");
});

test("rows that were already settled do not re-toast", () => {
  const done = frame("start", { status: "completed", blobUrl: "img" });
  assert.equal(generationTransitions({ frames: [done], clips: [] }, { frames: [done], clips: [] }).length, 0);
});

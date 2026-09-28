import assert from "node:assert/strict";
import { test } from "node:test";
import { isCurrentTask, RECENT_SETTLED_MS, taskDetail, taskStage } from "@/service/generation/task-list";

test("status maps to the five UI stages", () => {
  assert.equal(taskStage("pending"), "queued");
  assert.equal(taskStage("submitting"), "sending");
  assert.equal(taskStage("queued"), "generating");
  assert.equal(taskStage("in_progress"), "generating");
  assert.equal(taskStage("completed"), "done");
  assert.equal(taskStage("failed"), "failed");
  assert.equal(taskStage("nsfw"), "failed");
});

test("detail names the clip and slot", () => {
  assert.equal(taskDetail({ kind: "frame", clipIndex: 1, framePosition: "start" }), "Clip 2 · 起始畫格");
  assert.equal(taskDetail({ kind: "frame", clipIndex: 0, framePosition: "end" }), "Clip 1 · 結尾畫格");
  assert.equal(taskDetail({ kind: "video", clipIndex: 2 }), "Clip 3 · 影片");
  assert.equal(taskDetail({ kind: "still", clipIndex: -1 }), "角色定裝圖");
  assert.equal(taskDetail({ kind: "character", clipIndex: -1 }), "角色藍圖");
});

test("default list keeps pending and fresh settled, drops old history", () => {
  const now = Date.parse("2026-09-28T08:00:00.000Z");
  const fresh = new Date(now - 10 * 60 * 1000).toISOString();
  const stale = new Date(now - RECENT_SETTLED_MS - 1).toISOString();
  assert.equal(isCurrentTask("queued", stale, now), true);
  assert.equal(isCurrentTask("generating", stale, now), true);
  assert.equal(isCurrentTask("done", fresh, now), true);
  assert.equal(isCurrentTask("failed", fresh, now), true);
  assert.equal(isCurrentTask("done", stale, now), false);
  assert.equal(isCurrentTask("failed", stale, now), false);
});

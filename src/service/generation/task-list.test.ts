import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { isCurrentTask, jobListQuery, RECENT_SETTLED_MS, reelTask, taskDetail, taskStage } from "@/service/generation/task-list";

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

test("a reel in progress is a 成片合成 background task", () => {
  const now = Date.parse("2026-09-28T08:00:00.000Z");
  const task = reelTask(
    {
      videoId: "v1",
      projectId: "p1",
      title: "雪山",
      reelStatus: "in_progress",
      updatedAt: new Date(now).toISOString(),
    },
    now,
  );
  assert.equal(task?.detail, "成片合成");
  assert.equal(task?.stage, "generating");
  assert.equal(task?.isVideo, true);
  assert.equal(
    reelTask(
      {
        videoId: "v1",
        projectId: "p1",
        title: "雪山",
        reelStatus: "completed",
        reelUrl: "https://blob/reel.mp4",
        updatedAt: new Date(now - RECENT_SETTLED_MS - 1).toISOString(),
      },
      now,
    ),
    null,
  );
});

test("jobListQuery uses a single projectId for one video", () => {
  const id = new ObjectId();
  const cutoff = new Date("2026-09-28T00:00:00.000Z");
  const query = jobListQuery({ videoIds: [id], characterIds: [], cutoff });
  assert.equal(query?.$and[0].projectId, id);
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

import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicTask } from "@/service/generation/task-list";
import { settledVideoIds } from "@/presentation/components/app/tasks/settled-video-ids";

function task(id: string, stage: PublicTask["stage"], videoId?: string): PublicTask {
  return {
    id,
    kind: "frame",
    stage,
    title: "t",
    detail: "d",
    detailKey: "tasksPage.detail.clipFrameStart",
    isVideo: false,
    videoId,
    href: videoId ? `/app/projects/p?video=${videoId}` : "/app/characters",
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("settledVideoIds notices a job that just completed", () => {
  const prev = [task("job-1", "generating", "video-a")];
  const next = [task("job-1", "done", "video-a")];
  assert.deepEqual(settledVideoIds(prev, next), ["video-a"]);
});

test("settledVideoIds ignores tasks that were already finished", () => {
  const done = [task("job-1", "done", "video-a")];
  assert.deepEqual(settledVideoIds(done, done), []);
});

test("settledVideoIds follows an optimistic row replaced by the finished job", () => {
  const prev = [task("optimistic:1", "queued", "video-a")];
  const next = [task("job-1", "done", "video-a")];
  assert.deepEqual(settledVideoIds(prev, next), ["video-a"]);
});

test("settledVideoIds waits while another job for the same video is still running", () => {
  const prev = [task("optimistic:1", "queued", "video-a")];
  const next = [task("job-1", "generating", "video-a"), task("job-old", "done", "video-a")];
  assert.deepEqual(settledVideoIds(prev, next), []);
});

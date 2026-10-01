import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicTask } from "@/service/generation/task-list";
import { settledGenerationTasks } from "@/presentation/components/app/tasks/settled-generation-tasks";

const now = Date.parse("2026-10-01T12:00:00.000Z");

function task(id: string, stage: PublicTask["stage"], extra: Partial<PublicTask> = {}): PublicTask {
  return {
    id,
    kind: "frame",
    stage,
    title: "t",
    detail: "d",
    detailKey: "tasksPage.detail.clipFrameStart",
    detailParams: { n: 1 },
    isVideo: false,
    videoId: "video-a",
    href: "/app/projects/p?video=video-a",
    attempts: 0,
    createdAt: "2026-10-01T11:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...extra,
  };
}

test("settledGenerationTasks reports a frame that just finished", () => {
  const prev = [task("job-1", "generating")];
  const next = [task("job-1", "done", { previewUrl: "https://blob/new.png" })];
  assert.deepEqual(settledGenerationTasks(prev, next, now).map((item) => item.id), ["job-1"]);
});

test("settledGenerationTasks ignores jobs that were already done", () => {
  const done = [task("job-1", "done")];
  assert.equal(settledGenerationTasks(done, done, now).length, 0);
});

test("settledGenerationTasks skips reel compose", () => {
  const prev = [task("reel:video-a", "generating", { kind: "reel", isVideo: true })];
  const next = [task("reel:video-a", "done", { kind: "reel", isVideo: true })];
  assert.equal(settledGenerationTasks(prev, next, now).length, 0);
});

test("settledGenerationTasks follows an optimistic row replaced by a fresh finished job", () => {
  const prev = [task("optimistic:1", "queued")];
  const next = [task("job-9", "done", { previewUrl: "https://blob/clip.mp4", kind: "video", isVideo: true })];
  assert.deepEqual(settledGenerationTasks(prev, next, now).map((item) => item.id), ["job-9"]);
});

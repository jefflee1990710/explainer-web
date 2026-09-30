import assert from "node:assert/strict";
import { test } from "node:test";
import { visibleTasks } from "@/presentation/components/app/tasks/visible-tasks";
import type { PublicTask } from "@/service/generation/task-list";

function task(id: string, stage: PublicTask["stage"], updatedAt: string): PublicTask {
  return {
    id,
    kind: "video",
    stage,
    title: "t",
    detail: id,
    isVideo: true,
    href: "/app",
    attempts: 0,
    createdAt: updatedAt,
    updatedAt,
  };
}

test("visibleTasks keeps every active job and only the five newest finished ones", () => {
  const tasks = [
    task("run", "generating", "2026-09-30T12:10:00.000Z"),
    task("queue", "queued", "2026-09-30T12:09:00.000Z"),
    task("d1", "done", "2026-09-30T12:08:00.000Z"),
    task("d2", "done", "2026-09-30T12:07:00.000Z"),
    task("fail", "failed", "2026-09-30T12:06:00.000Z"),
    task("d3", "done", "2026-09-30T12:05:00.000Z"),
    task("d4", "done", "2026-09-30T12:04:00.000Z"),
    task("old", "done", "2026-09-30T12:01:00.000Z"),
  ];
  assert.deepEqual(
    visibleTasks(tasks).map((item) => item.id),
    ["run", "queue", "d1", "d2", "fail", "d3", "d4"],
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readCachedTasks, rememberTasks } from "@/presentation/components/app/tasks/task-cache";
import type { PublicTask } from "@/service/generation/task-list";

function task(id: string): PublicTask {
  return {
    id,
    kind: "video",
    stage: "queued",
    title: "t",
    detail: "Clip 1 · 影片",
    isVideo: true,
    href: "/app",
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("rememberTasks is keyed by video so the dialog can open instantly", () => {
  rememberTasks("vid-1", [task("a")]);
  rememberTasks("vid-2", [task("b")]);
  assert.equal(readCachedTasks("vid-1")?.[0].id, "a");
  assert.equal(readCachedTasks("vid-2")?.[0].id, "b");
});

test("video dialog falls back to the global list when its own cache is cold", () => {
  rememberTasks(undefined, [
    { ...task("keep"), href: "/app/projects/p1?video=vid-9" },
    { ...task("skip"), href: "/app/projects/p1?video=other" },
  ]);
  const seeded = readCachedTasks("vid-9");
  assert.equal(seeded?.length, 1);
  assert.equal(seeded?.[0].id, "keep");
});

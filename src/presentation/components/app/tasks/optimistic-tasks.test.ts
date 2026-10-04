import assert from "node:assert/strict";
import { test } from "node:test";
import {
  holdOptimisticTasks,
  mergeOptimisticTasks,
  paidKeyTasks,
  pruneOptimisticTasks,
  readOptimisticTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import type { PublicTask } from "@/service/generation/task-list";

const video = {
  videoId: "vid-1",
  projectId: "proj-1",
  title: "Scro",
};

function serverTask(detail: string, stage: PublicTask["stage"] = "queued"): PublicTask {
  return {
    id: `job-${detail}`,
    kind: detail.includes("影片") ? "video" : "frame",
    stage,
    title: "Scro",
    detail,
    detailKey: detail.includes("影片") ? "tasksPage.detail.clipVideo" : "tasksPage.detail.clipFrameStart",
    detailParams: { n: 1 },
    isVideo: detail.includes("影片"),
    href: "/app/projects/proj-1/videos/vid-1",
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  };
}

test("paidKeyTasks turns a generate click into queued rows before the job exists", () => {
  const tasks = paidKeyTasks({
    ...video,
    keys: ["video:3", "frames:2", "frame:1:end", "clip:4", "cover"],
    now: "2026-09-30T12:00:00.000Z",
  });
  assert.deepEqual(
    tasks.map((task) => task.detail),
    ["Clip 3 · 影片", "Clip 2 · 起始畫格", "Clip 2 · 結尾畫格", "Clip 1 · 結尾畫格", "影片封面"],
  );
  assert.equal(tasks.every((task) => task.stage === "queued" && task.id.startsWith("optimistic:")), true);
  assert.equal(tasks.at(-1)?.kind, "reelCover");
});

test("merge keeps optimistic rows until a matching active server job arrives", () => {
  const optimistic = paidKeyTasks({ ...video, keys: ["video:3", "frames:2"] });
  const stale = mergeOptimisticTasks([serverTask("Clip 1 · 起始畫格", "done")], optimistic);
  assert.equal(stale.filter((task) => task.id.startsWith("optimistic:")).length, 3);

  const fresh = mergeOptimisticTasks(
    [serverTask("Clip 3 · 影片"), serverTask("Clip 2 · 起始畫格"), serverTask("Clip 2 · 結尾畫格")],
    optimistic,
  );
  assert.equal(fresh.some((task) => task.id.startsWith("optimistic:")), false);
  assert.equal(fresh[0].detail, "Clip 3 · 影片");
});

test("holds show up immediately and drop once the server list includes them", () => {
  const held = holdOptimisticTasks(paidKeyTasks({ ...video, keys: ["video:5"] }));
  assert.equal(readOptimisticTasks("vid-1")[0]?.detail, "Clip 5 · 影片");
  assert.equal(readOptimisticTasks()[0]?.detail, "Clip 5 · 影片");

  const stillHeld = pruneOptimisticTasks([serverTask("Clip 1 · 影片")], "vid-1");
  assert.equal(stillHeld.length, 1);

  const dropped = pruneOptimisticTasks([serverTask("Clip 5 · 影片")], "vid-1");
  assert.equal(dropped.length, 0);
  assert.equal(readOptimisticTasks("vid-1").length, 0);

  releaseOptimisticTasks(held);
});

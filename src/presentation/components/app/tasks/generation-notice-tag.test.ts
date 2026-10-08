import assert from "node:assert/strict";
import test from "node:test";
import type { PublicTask } from "@/service/generation/task-list";
import { taskNoticeTag } from "@/presentation/components/app/tasks/generation-notice-tag";

function task(extra: Partial<PublicTask>): PublicTask {
  return {
    id: "job-1",
    kind: "frame",
    stage: "done",
    title: "t",
    detail: "d",
    detailKey: "tasksPage.detail.clipFrameStart",
    detailParams: { n: 2 },
    isVideo: false,
    videoId: "video-a",
    href: "/app/projects/p/videos/video-a",
    attempts: 0,
    createdAt: "2026-10-01T11:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...extra,
  };
}

test("a frame and its clip video share stable browser-notification tags", () => {
  assert.equal(taskNoticeTag(task({})), "gen:frame:video-a:2:start");
  assert.equal(
    taskNoticeTag(task({ detailKey: "tasksPage.detail.clipFrameEnd" })),
    "gen:frame:video-a:2:end",
  );
  assert.equal(
    taskNoticeTag(task({ kind: "video", isVideo: true, detailKey: "tasksPage.detail.clipVideo" })),
    "gen:video:video-a:2",
  );
});

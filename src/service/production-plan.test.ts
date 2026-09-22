import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/model/project";
import type { ClipStageSource } from "@/service/clip-stage";
import { planRemaining } from "@/service/production-plan";

function frame(
  clipNumber: number,
  position: ClipFrame["position"],
  status: ClipFrame["status"],
  submittedAt?: string,
): ClipFrame {
  return {
    clipNumber,
    position,
    prompt: "p",
    status,
    submittedAt,
    ...(status === "completed" ? { blobUrl: `frame-${clipNumber}-${position}` } : {}),
  };
}
function clip(clipNumber: number, status: ProjectClip["status"]): ProjectClip {
  return {
    clipNumber,
    durationSeconds: 5,
    prompt: "v",
    status,
    ...(status === "completed" ? { blobUrl: `clip-${clipNumber}` } : {}),
  };
}
const done = (n: number) => [frame(n, "start", "completed"), frame(n, "end", "completed")];

test("fills gaps only: frames for empty/failed, video for frames_ready/video_failed", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [1, 2, 3, 4, 5, 6].map((clipNumber) => ({ clipNumber })) },
    frames: [
      ...done(1), // video done → skip
      ...done(2), // frames ready → video
      frame(3, "start", "completed"), frame(3, "end", "in_progress"), // generating → skip
      ...done(4), // video failed → video
      frame(5, "start", "failed"), frame(5, "end", "completed"), // frames failed → frames
      // 6: nothing → frames
    ],
    clips: [clip(1, "completed"), clip(4, "failed")],
  };
  assert.deepEqual(planRemaining(project), { frames: [5, 6], videos: [2, 4], cost: 2 * 2 + 2 * 1 });
});

test("skips video for clips whose frames are stale", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-02-01T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-01T00:00:00.000Z"),
    ],
    clips: [],
  };
  assert.deepEqual(planRemaining(project), { frames: [], videos: [], cost: 0 });
});

test("empty plan when everything is done", () => {
  const project: ClipStageSource = {
    status: "ready",
    phaseA: { clips: [{ clipNumber: 1 }] },
    frames: done(1),
    clips: [clip(1, "completed")],
  };
  assert.deepEqual(planRemaining(project), { frames: [], videos: [], cost: 0 });
});

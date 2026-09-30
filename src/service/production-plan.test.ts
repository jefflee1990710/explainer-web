import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/model/project";
import type { ClipStageSource } from "@/service/clip-stage";
import {
  autoVideoDecision,
  cheapestVideoCost,
  clipVideoCost,
  FRAMES_COST,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
  planSelected,
  MIN_VIDEO_COST,
} from "@/service/production-plan";

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
  assert.deepEqual(planRemaining(project), {
    frames: [5, 6],
    videos: [2, 4],
    cost: 2 * FRAMES_COST + 2 * MIN_VIDEO_COST,
  });
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

test("generate all scenes redraws every clip that is not already drawing", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [1, 2, 3].map((clipNumber) => ({ clipNumber })) },
    frames: [
      ...done(1),
      frame(2, "start", "completed"),
      frame(2, "end", "in_progress"),
    ],
    clips: [clip(1, "completed")],
  };
  assert.deepEqual(planGenerateAllScenes(project), { frames: [1, 3], videos: [], cost: 2 * FRAMES_COST });
});

test("generate all clips reserves a video for every clip and skips in-flight frames", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [1, 2].map((clipNumber) => ({ clipNumber })) },
    frames: [frame(2, "start", "queued"), frame(2, "end", "queued")],
    clips: [],
  };
  assert.deepEqual(planGenerateAllClips(project), {
    frames: [1],
    videos: [1, 2],
    cost: FRAMES_COST + 2 * MIN_VIDEO_COST,
  });
});

test("video cost follows each clip's storyboard duration", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: {
      clips: [
        { clipNumber: 1, durationSeconds: 3 },
        { clipNumber: 2, durationSeconds: 8 },
      ],
    },
    frames: [],
    clips: [],
  };
  assert.equal(clipVideoCost(project, 2), 72);
  assert.equal(cheapestVideoCost(project, [1, 2]), 45);
  assert.equal(planGenerateAllClips(project).cost, 2 * FRAMES_COST + 45 + 72);
});

test("auto video waits until both stills exist, then starts once", () => {
  const frames = [
    frame(1, "start", "completed", "2026-03-01T00:00:00.000Z"),
    frame(1, "end", "queued", "2026-03-01T00:00:01.000Z"),
  ];
  assert.equal(autoVideoDecision(frames, [], 1), "wait");
  frames[1] = frame(1, "end", "completed", "2026-03-01T00:00:02.000Z");
  assert.equal(autoVideoDecision(frames, [], 1), "start");
  assert.equal(
    autoVideoDecision(frames, [clip(1, "completed")], 1),
    "start",
  );
  const filmed = {
    ...clip(1, "completed"),
    submittedAt: "2026-03-01T00:00:03.000Z",
  };
  assert.equal(autoVideoDecision(frames, [filmed], 1), "done");
  assert.equal(
    autoVideoDecision(
      [frame(1, "start", "failed"), frame(1, "end", "completed")],
      [],
      1,
    ),
    "drop",
  );
});

test("selected frames skip clips that are already generating", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [1, 2, 3].map((clipNumber) => ({ clipNumber })) },
    frames: [...done(1), frame(2, "start", "queued"), frame(2, "end", "queued")],
    clips: [clip(1, "completed")],
  };
  assert.deepEqual(planSelected(project, [1, 2, 3], "frames"), {
    frames: [1, 3],
    videos: [],
    cost: 2 * FRAMES_COST,
  });
});

test("selected frames can queue while a video is still pending", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
    frames: [...done(1), ...done(2)],
    clips: [clip(1, "queued")],
  };
  assert.deepEqual(planSelected(project, [1, 2], "frames"), {
    frames: [1, 2],
    videos: [],
    cost: 2 * FRAMES_COST,
  });
});

test("selected videos need fresh, finished frames", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: {
      clips: [
        { clipNumber: 1 },
        { clipNumber: 2 },
        { clipNumber: 3, editedAt: "2026-02-01T00:00:00.000Z" },
        { clipNumber: 4 },
      ],
    },
    frames: [
      ...done(1),
      ...done(2),
      frame(3, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(3, "end", "completed", "2026-01-01T00:00:00.000Z"),
    ],
    clips: [clip(2, "completed")],
  };
  assert.deepEqual(planSelected(project, [1, 2, 3, 4], "videos"), {
    frames: [],
    videos: [1, 2],
    cost: 2 * MIN_VIDEO_COST,
  });
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

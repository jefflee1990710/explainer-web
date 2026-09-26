import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/model/project";
import {
  clipStateFor,
  defaultSelectedClip,
  isProjectBusy,
  isProjectReady,
  productionCounts,
  type ClipStageSource,
} from "@/service/clip-stage";

function frame(
  clipNumber: number,
  position: ClipFrame["position"],
  status: ClipFrame["status"],
  submittedAt?: string,
  extra?: Partial<ClipFrame>,
): ClipFrame {
  return {
    clipNumber,
    position,
    prompt: "p",
    status,
    submittedAt,
    // Completed fixtures are "really done" unless the test strips the file.
    ...(status === "completed" ? { blobUrl: `frame-${clipNumber}-${position}` } : {}),
    ...extra,
  };
}

function clip(
  clipNumber: number,
  status: ProjectClip["status"],
  submittedAt?: string,
  extra?: Partial<ProjectClip>,
): ProjectClip {
  return {
    clipNumber,
    durationSeconds: 5,
    prompt: "v",
    status,
    submittedAt,
    ...(status === "completed" ? { blobUrl: `clip-${clipNumber}` } : {}),
    ...extra,
  };
}

function project(
  overrides: Partial<ClipStageSource> = {},
): ClipStageSource {
  return {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
    frames: [],
    clips: [],
    ...overrides,
  };
}

test("no frames at all → no_frames", () => {
  assert.equal(clipStateFor(project(), 1).stage, "no_frames");
});

test("one frame in flight → frames_generating", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "in_progress")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_generating");
});

test("one frame failed and none in flight → frames_failed", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "failed")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_failed");
});

test("both frames completed, no video → frames_ready", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "completed")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_ready");
});

test("only one frame completed (other missing) → no_frames", () => {
  const p = project({ frames: [frame(1, "start", "completed")] });
  assert.equal(clipStateFor(p, 1).stage, "no_frames");
});

test("video queued → video_generating, beats everything", () => {
  const p = project({
    frames: [frame(1, "start", "in_progress"), frame(1, "end", "completed")],
    clips: [clip(1, "queued")],
  });
  assert.equal(clipStateFor(p, 1).stage, "video_generating");
});

test("video completed → video_ready; failed → video_failed", () => {
  const frames = [frame(1, "start", "completed"), frame(1, "end", "completed")];
  assert.equal(clipStateFor(project({ frames, clips: [clip(1, "completed")] }), 1).stage, "video_ready");
  assert.equal(clipStateFor(project({ frames, clips: [clip(1, "failed")] }), 1).stage, "video_failed");
});

test("frames being redrawn outrank a finished video", () => {
  const p = project({
    frames: [frame(1, "start", "queued"), frame(1, "end", "completed")],
    clips: [clip(1, "completed")],
  });
  assert.equal(clipStateFor(p, 1).stage, "frames_generating");
});

test("stale.frames when the row was edited after a frame was submitted", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-02T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-03T00:00:00.000Z"),
    ],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: true, video: false });
});

test("stale.video when the row was edited after the video was submitted", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-05T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-06T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-06T00:00:00.000Z"),
    ],
    clips: [clip(1, "completed", "2026-01-04T00:00:00.000Z")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: true });
});

test("stale.video when a frame was redrawn after the video was submitted", () => {
  const p = project({
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-09T00:00:00.000Z"),
    ],
    clips: [clip(1, "completed", "2026-01-05T00:00:00.000Z")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: true });
});

test("missing timestamps never flag stale (legacy data)", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-05T00:00:00.000Z" }] },
    frames: [frame(1, "start", "completed"), frame(1, "end", "completed")],
    clips: [clip(1, "completed")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: false });
});

test("isProjectBusy: phase_a, or any frame/clip in flight", () => {
  assert.equal(isProjectBusy(project({ status: "phase_a" })), true);
  assert.equal(isProjectBusy(project()), false);
  assert.equal(isProjectBusy(project({ frames: [frame(1, "start", "queued")] })), true);
  assert.equal(isProjectBusy(project({ clips: [clip(2, "in_progress")] })), true);
  assert.equal(isProjectBusy(project({ status: "ready", clips: [clip(1, "completed")] })), false);
});

test("isProjectReady only when every storyboard clip has a completed video", () => {
  assert.equal(isProjectReady(project({ clips: [clip(1, "completed")] })), false);
  assert.equal(
    isProjectReady(project({ clips: [clip(1, "completed"), clip(2, "completed")] })),
    true,
  );
  assert.equal(isProjectReady(project({ phaseA: { clips: [] } })), false);
});

test("isProjectReady false while a completed clip is redrawing frames", () => {
  const bothDone = project({
    frames: [
      frame(1, "start", "completed"),
      frame(1, "end", "completed"),
      frame(2, "start", "completed"),
      frame(2, "end", "completed"),
    ],
    clips: [clip(1, "completed"), clip(2, "completed")],
  });
  assert.equal(isProjectReady(bothDone), true);

  assert.equal(
    isProjectReady(
      project({
        frames: [
          frame(1, "start", "queued"),
          frame(1, "end", "completed"),
          frame(2, "start", "completed"),
          frame(2, "end", "completed"),
        ],
        clips: [clip(1, "completed"), clip(2, "completed")],
      }),
    ),
    false,
  );

  assert.equal(
    isProjectReady(
      project({
        phaseA: { clips: [{ clipNumber: 1 }] },
        frames: [frame(1, "start", "failed"), frame(1, "end", "completed")],
        clips: [clip(1, "completed")],
      }),
    ),
    false,
  );
});

test("productionCounts", () => {
  const p = project({
    frames: [
      frame(1, "start", "completed"),
      frame(1, "end", "completed"),
      frame(2, "start", "completed"),
    ],
    clips: [clip(1, "completed")],
  });
  assert.deepEqual(productionCounts(p), { total: 2, framesDone: 1, videosDone: 1 });
});

test("completed frames without a file are still generating, not ready", () => {
  const p = project({
    frames: [
      frame(1, "start", "completed", undefined, { blobUrl: undefined, outputUrl: undefined }),
      frame(1, "end", "completed", undefined, { blobUrl: undefined, outputUrl: undefined }),
    ],
  });
  assert.equal(clipStateFor(p, 1).stage, "frames_generating");
  assert.equal(isProjectBusy(p), true);
  assert.deepEqual(productionCounts(p), { total: 2, framesDone: 0, videosDone: 0 });
});

test("defaultSelectedClip picks the first clip that is not video_ready", () => {
  const selected = defaultSelectedClip([
    { clipNumber: 1, stage: "video_ready" },
    { clipNumber: 2, stage: "frames_ready" },
    { clipNumber: 3, stage: "no_frames" },
  ]);
  assert.equal(selected, 2);
});

test("defaultSelectedClip falls back to the first clip when all are ready", () => {
  assert.equal(
    defaultSelectedClip([
      { clipNumber: 1, stage: "video_ready" },
      { clipNumber: 2, stage: "video_ready" },
    ]),
    1,
  );
});

test("completed video without a file is still generating, not ready", () => {
  const p = project({
    frames: [frame(1, "start", "completed"), frame(1, "end", "completed")],
    clips: [clip(1, "completed", undefined, { blobUrl: undefined, outputUrl: undefined })],
  });
  assert.equal(clipStateFor(p, 1).stage, "video_generating");
  assert.equal(isProjectBusy(p), true);
  assert.equal(isProjectReady(p), false);
  assert.deepEqual(productionCounts(p), { total: 2, framesDone: 1, videosDone: 0 });
});

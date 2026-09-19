import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { GenerationJob } from "@/types/generation-job";
import type { ClipFrame, ProjectClip } from "@/types/project";
import { nextProjectStatus, reconcileClips, reconcileFrames } from "./reconcile";

function job(partial: Partial<GenerationJob> & Pick<GenerationJob, "kind" | "clipIndex" | "status">): GenerationJob {
  return {
    _id: new ObjectId(),
    projectId: new ObjectId(),
    model: "m",
    requestId: Math.random().toString(36).slice(2),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  };
}

const frames: ClipFrame[] = [
  { clipNumber: 1, position: "start", prompt: "p", status: "queued" },
  { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  { clipNumber: 2, position: "start", prompt: "p", status: "completed", blobUrl: "kept" },
];

test("reconcileFrames takes status/urls from the matching job and keeps frames without one", () => {
  const next = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "completed", blobUrl: "b1", outputUrl: "o1" }),
    job({ kind: "frame", clipIndex: 0, framePosition: "end", status: "nsfw", error: "nsfw" }),
    job({ kind: "video", clipIndex: 0, status: "completed", blobUrl: "not-a-frame" }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "b1");
  assert.equal(next[1].status, "failed");
  assert.equal(next[1].error, "nsfw");
  assert.equal(next[2].blobUrl, "kept");
});

test("newest job wins when several exist for one slot", () => {
  const next = reconcileFrames([frames[0]], [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "completed", blobUrl: "old", createdAt: new Date("2026-01-01T00:00:00Z") }),
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "in_progress", createdAt: new Date("2026-01-02T00:00:00Z") }),
  ]);
  assert.equal(next[0].status, "in_progress");
  assert.equal(next[0].blobUrl, undefined);
});

test("reconcileClips maps video jobs per clip and leaves others alone", () => {
  const clips: ProjectClip[] = [
    { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "queued" },
    { clipNumber: 2, durationSeconds: 5, prompt: "v", status: "failed", error: "llm" },
  ];
  const next = reconcileClips(clips, [
    job({ kind: "video", clipIndex: 0, status: "completed", blobUrl: "vid" }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "vid");
  assert.equal(next[1].status, "failed");
  assert.equal(next[1].error, "llm");
});

test("reconcileFrames ignores a job older than the frame's claim", () => {
  const claimed: ClipFrame = {
    clipNumber: 1,
    position: "start",
    prompt: "p",
    status: "queued",
    submittedAt: "2026-01-02T00:00:00.000Z",
  };
  const old = job({
    kind: "frame",
    clipIndex: 0,
    framePosition: "start",
    status: "completed",
    blobUrl: "old",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
  assert.deepEqual(reconcileFrames([claimed], [old]), [claimed]);

  const fresh = job({
    kind: "frame",
    clipIndex: 0,
    framePosition: "start",
    status: "completed",
    blobUrl: "new",
    createdAt: new Date("2026-01-03T00:00:00Z"),
  });
  const next = reconcileFrames([claimed], [old, fresh]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "new");
});

test("reconcileFrames still applies old jobs to legacy frames without submittedAt", () => {
  const legacy: ClipFrame = { clipNumber: 1, position: "start", prompt: "p", status: "queued" };
  const next = reconcileFrames([legacy], [
    job({
      kind: "frame",
      clipIndex: 0,
      framePosition: "start",
      status: "completed",
      blobUrl: "old",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "old");
});

test("reconcileClips ignores a job older than the clip's claim", () => {
  const claimed: ProjectClip = {
    clipNumber: 1,
    durationSeconds: 5,
    prompt: "v",
    status: "queued",
    submittedAt: "2026-01-02T00:00:00.000Z",
    blobUrl: "old-video",
  };
  const old = job({
    kind: "video",
    clipIndex: 0,
    status: "completed",
    blobUrl: "old-video",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
  assert.deepEqual(reconcileClips([claimed], [old]), [claimed]);

  const fresh = job({
    kind: "video",
    clipIndex: 0,
    status: "completed",
    blobUrl: "new-video",
    createdAt: new Date("2026-01-03T00:00:00Z"),
  });
  const next = reconcileClips([claimed], [old, fresh]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "new-video");
});

test("reconcileClips still applies old jobs to legacy clips without submittedAt", () => {
  const legacy: ProjectClip = { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "queued" };
  const next = reconcileClips([legacy], [
    job({
      kind: "video",
      clipIndex: 0,
      status: "completed",
      blobUrl: "old-video",
      createdAt: new Date("2020-01-01T00:00:00Z"),
    }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "old-video");
});

test("reconcileClips keeps the previous video playable while the new job is pending", () => {
  const clips: ProjectClip[] = [
    { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "queued", blobUrl: "old-video" },
  ];
  const pending = reconcileClips(clips, [job({ kind: "video", clipIndex: 0, status: "in_progress" })]);
  assert.equal(pending[0].status, "in_progress");
  assert.equal(pending[0].blobUrl, "old-video");

  const failed = reconcileClips(clips, [job({ kind: "video", clipIndex: 0, status: "failed", error: "boom" })]);
  assert.equal(failed[0].status, "failed");
  assert.equal(failed[0].blobUrl, "old-video");
});

test("reconcileClips keeps the last video when a completed job has no file", () => {
  const clips: ProjectClip[] = [
    { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "completed", blobUrl: "old-video" },
  ];
  const next = reconcileClips(clips, [job({ kind: "video", clipIndex: 0, status: "completed" })]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "old-video");
});

test("reconcileFrames keeps the last image while pending, failed, or completed without a file", () => {
  const frames: ClipFrame[] = [
    { clipNumber: 1, position: "start", prompt: "p", status: "queued", blobUrl: "old-start" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued", blobUrl: "old-end" },
  ];
  const pending = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "in_progress" }),
  ]);
  assert.equal(pending[0].blobUrl, "old-start");

  const failed = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "end", status: "failed", error: "boom" }),
  ]);
  assert.equal(failed[1].status, "failed");
  assert.equal(failed[1].blobUrl, "old-end");

  const emptyDone = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "completed" }),
  ]);
  assert.equal(emptyDone[0].status, "completed");
  assert.equal(emptyDone[0].blobUrl, "old-start");
});

test("nextProjectStatus: production ↔ ready, other statuses untouched", () => {
  const rows = { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] };
  const done: ProjectClip = {
    clipNumber: 1,
    durationSeconds: 5,
    prompt: "v",
    status: "completed",
    blobUrl: "vid",
  };
  const done2: ProjectClip = { ...done, clipNumber: 2 };
  assert.equal(nextProjectStatus({ status: "production", phaseA: rows, clips: [done] }), "production");
  assert.equal(nextProjectStatus({ status: "production", phaseA: rows, clips: [done, done2] }), "ready");
  assert.equal(nextProjectStatus({ status: "ready", phaseA: rows, clips: [done, { ...done2, status: "queued" }] }), "production");
  assert.equal(nextProjectStatus({ status: "generating", phaseA: rows, clips: [] }), "production");
  assert.equal(nextProjectStatus({ status: "awaiting_approval", phaseA: rows, clips: [] }), "awaiting_approval");
  assert.equal(nextProjectStatus({ status: "phase_a", clips: [] }), "phase_a");
});

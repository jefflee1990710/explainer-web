import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/types/project";
import {
  clearClipsForAction,
  clearFramesForAction,
  mergePolledClips,
  mergePolledFrames,
} from "./optimistic-frames";

const frames: ClipFrame[] = [
  {
    clipNumber: 1,
    position: "start",
    prompt: "p",
    status: "completed",
    blobUrl: "old-start",
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    clipNumber: 1,
    position: "end",
    prompt: "p",
    status: "completed",
    blobUrl: "old-end",
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    clipNumber: 2,
    position: "start",
    prompt: "p",
    status: "completed",
    blobUrl: "keep",
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
];

test("clearFramesForAction drops one still on single-frame redo", () => {
  const next = clearFramesForAction(frames, "frame:1:end");
  assert.equal(next[0].blobUrl, "old-start");
  assert.equal(next[1].blobUrl, undefined);
  assert.equal(next[1].status, "queued");
  assert.equal(next[2].blobUrl, "keep");
});

test("clearFramesForAction drops both stills on two-frame redo", () => {
  const next = clearFramesForAction(frames, "frames:1");
  assert.equal(next[0].blobUrl, undefined);
  assert.equal(next[1].blobUrl, undefined);
  assert.equal(next[0].status, "queued");
  assert.equal(next[2].blobUrl, "keep");
});

test("clearFramesForAction also drops both stills after save-and-redraw", () => {
  const next = clearFramesForAction(frames, "clip:1:regen");
  assert.equal(next[0].blobUrl, undefined);
  assert.equal(next[1].blobUrl, undefined);
  assert.equal(frames, clearFramesForAction(frames, "clip:1"));
});

test("mergePolledFrames keeps the optimistic still until the server claim is newer", () => {
  const optimistic: ClipFrame[] = [
    {
      ...frames[0],
      status: "queued",
      blobUrl: undefined,
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    frames[1],
    frames[2],
  ];
  const stale = mergePolledFrames(optimistic, frames);
  assert.equal(stale[0].blobUrl, undefined);
  assert.equal(stale[0].status, "queued");
  assert.equal(stale[1].blobUrl, "old-end");

  const fresh: ClipFrame[] = [
    {
      ...frames[0],
      status: "in_progress",
      blobUrl: undefined,
      submittedAt: "2026-01-01T00:00:05.000Z",
    },
    frames[1],
    frames[2],
  ];
  const caughtUp = mergePolledFrames(optimistic, fresh);
  assert.equal(caughtUp[0].status, "in_progress");
});

test("mergePolledFrames accepts a completed still once the server claim catches up", () => {
  const optimistic: ClipFrame[] = [
    {
      ...frames[0],
      status: "queued",
      blobUrl: undefined,
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    frames[1],
    frames[2],
  ];
  const done: ClipFrame[] = [
    {
      ...frames[0],
      status: "completed",
      blobUrl: "new-start",
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    frames[1],
    frames[2],
  ];
  const next = mergePolledFrames(optimistic, done);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "new-start");
});

const clips: ProjectClip[] = [
  {
    clipNumber: 1,
    durationSeconds: 5,
    prompt: "v",
    status: "completed",
    blobUrl: "old-video",
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    clipNumber: 2,
    durationSeconds: 5,
    prompt: "v",
    status: "completed",
    blobUrl: "keep-video",
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
];

test("clearClipsForAction drops the previous video on redo", () => {
  const next = clearClipsForAction(clips, "video:1");
  assert.equal(next[0].blobUrl, undefined);
  assert.equal(next[0].status, "queued");
  assert.equal(next[1].blobUrl, "keep-video");
  assert.equal(clips, clearClipsForAction(clips, "frame:1:start"));
});

test("mergePolledClips keeps the optimistic video wait until the server claim is newer", () => {
  const optimistic: ProjectClip[] = [
    {
      ...clips[0],
      status: "queued",
      blobUrl: undefined,
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    clips[1],
  ];
  const stale = mergePolledClips(optimistic, clips);
  assert.equal(stale[0].blobUrl, undefined);
  assert.equal(stale[0].status, "queued");
  assert.equal(stale[1].blobUrl, "keep-video");

  const done: ProjectClip[] = [
    {
      ...clips[0],
      status: "completed",
      blobUrl: "new-video",
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    clips[1],
  ];
  const next = mergePolledClips(optimistic, done);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "new-video");
});

test("mergePolledFrames accepts a failed still for the same claim", () => {
  const optimistic: ClipFrame[] = [
    {
      ...frames[0],
      status: "queued",
      blobUrl: undefined,
      submittedAt: "2026-01-01T00:00:03.000Z",
    },
    frames[1],
    frames[2],
  ];
  const failed: ClipFrame[] = [
    {
      ...frames[0],
      status: "failed",
      blobUrl: undefined,
      error: "內容未通過安全檢查，請調整後重試",
      submittedAt: "2026-01-01T00:00:04.000Z",
    },
    frames[1],
    frames[2],
  ];
  const next = mergePolledFrames(optimistic, failed);
  assert.equal(next[0].status, "failed");
  assert.match(next[0].error || "", /安全檢查/);
});

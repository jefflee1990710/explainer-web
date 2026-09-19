import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame } from "@/types/project";
import {
  clearFramesForAction,
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

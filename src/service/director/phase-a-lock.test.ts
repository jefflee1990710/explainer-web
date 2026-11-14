import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PHASE_A_LOCK_STALE_MS,
  phaseAFramesAlreadyDrawing,
  phaseALockIsStale,
  phaseAReclaimShouldKeepStoryboard,
} from "@/service/director/phase-a-lock";

test("a phase A lock stays fresh for the long storyboard call and expires after eight minutes", () => {
  const now = new Date("2026-11-14T00:00:00.000Z");
  assert.equal(phaseALockIsStale(undefined, now), true);
  assert.equal(phaseALockIsStale({ at: now }, now), false);
  assert.equal(
    phaseALockIsStale({ at: new Date(now.getTime() - PHASE_A_LOCK_STALE_MS + 1) }, now),
    false,
  );
  assert.equal(
    phaseALockIsStale({ at: new Date(now.getTime() - PHASE_A_LOCK_STALE_MS) }, now),
    true,
  );
});

test("frames already queued or saved count as drawing", () => {
  assert.equal(phaseAFramesAlreadyDrawing([]), false);
  assert.equal(phaseAFramesAlreadyDrawing([{ status: "queued" }]), true);
  assert.equal(phaseAFramesAlreadyDrawing([{ blobUrl: "https://blob/frame.jpg" }]), true);
  assert.equal(phaseAFramesAlreadyDrawing([{ status: "failed" }]), false);
});

test("stale recovery keeps a storyboard whose frames are already drawing, and a revise does not", () => {
  const drawing = {
    hadLock: true,
    lockStale: true,
    hasPhaseA: true,
    framesDrawing: true,
  };
  assert.equal(phaseAReclaimShouldKeepStoryboard(drawing), true);
  assert.equal(phaseAReclaimShouldKeepStoryboard({ ...drawing, revisionNote: "換標題" }), false);
  assert.equal(phaseAReclaimShouldKeepStoryboard({ ...drawing, clipsOnly: true }), false);
  assert.equal(phaseAReclaimShouldKeepStoryboard({ ...drawing, hadLock: false }), false);
  assert.equal(phaseAReclaimShouldKeepStoryboard({ ...drawing, framesDrawing: false }), false);
});

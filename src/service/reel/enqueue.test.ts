import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldQueueReel } from "@/service/reel/enqueue";
import { clipReelFingerprint } from "@/service/reel/fingerprint";
import type { ClipStageSource } from "@/service/clip-stage";
import type { ReelRecord } from "@/service/reel/fingerprint";

function ready(overrides: Partial<ReelRecord> = {}): ClipStageSource & ReelRecord {
  return {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1, durationSeconds: 5 }] },
    frames: [],
    clips: [
      {
        clipNumber: 1,
        durationSeconds: 5,
        prompt: "p",
        status: "completed",
        blobUrl: "https://blob/a.mp4",
        submittedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

test("a finished clip with no reel does not auto-queue 成片合成", () => {
  assert.equal(shouldQueueReel(ready()), false);
});

test("an unfinished clip does not queue a reel", () => {
  const project = ready();
  project.clips[0].status = "in_progress";
  assert.equal(shouldQueueReel(project), false);
});

test("a reel already running or already current is not queued again", () => {
  const fingerprint = clipReelFingerprint(ready());
  assert.equal(shouldQueueReel(ready({ reelStatus: "in_progress", reelFingerprint: fingerprint })), false);
  assert.equal(
    shouldQueueReel(ready({ reelStatus: "completed", reelFingerprint: fingerprint, reelUrl: "https://blob/reel.mp4" })),
    false,
  );
  assert.equal(shouldQueueReel(ready({ reelStatus: "completed", reelFingerprint: "old", reelUrl: "https://blob/old.mp4" })), false);
});

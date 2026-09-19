import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clipReelFingerprint,
  clipUrlsInOrder,
  isReelBusy,
  isReelCurrent,
} from "./fingerprint";

const clips = [
  { clipNumber: 1, blobUrl: "https://blob/a.mp4", submittedAt: "2026-01-01T00:00:00.000Z" },
  { clipNumber: 2, blobUrl: "https://blob/b.mp4", submittedAt: "2026-01-01T00:01:00.000Z" },
];
const phaseA = { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] };

test("fingerprint follows storyboard order and clip identity", () => {
  const a = clipReelFingerprint({ phaseA, clips });
  const b = clipReelFingerprint({ phaseA, clips });
  assert.equal(a, b);
  assert.notEqual(
    a,
    clipReelFingerprint({
      phaseA,
      clips: [{ ...clips[0], blobUrl: "https://blob/c.mp4" }, clips[1]],
    }),
  );
});

test("clipUrlsInOrder walks the storyboard, not clips[] order", () => {
  assert.deepEqual(
    clipUrlsInOrder({
      phaseA,
      clips: [clips[1], clips[0]],
    }),
    ["https://blob/a.mp4", "https://blob/b.mp4"],
  );
});

test("isReelCurrent requires a completed reel for this fingerprint", () => {
  const fingerprint = clipReelFingerprint({ phaseA, clips });
  assert.equal(
    isReelCurrent({
      phaseA,
      clips,
      reelUrl: "https://blob/reel.mp4",
      reelStatus: "completed",
      reelFingerprint: fingerprint,
    }),
    true,
  );
  assert.equal(
    isReelCurrent({
      phaseA,
      clips,
      reelUrl: "https://blob/reel.mp4",
      reelStatus: "completed",
      reelFingerprint: "stale",
    }),
    false,
  );
  assert.equal(isReelBusy("queued"), true);
  assert.equal(isReelBusy("completed"), false);
});

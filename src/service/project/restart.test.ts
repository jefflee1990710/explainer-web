import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  RESTART_UNSET_FIELDS,
  restartBlobUrls,
  restartBlockReason,
} from "@/service/project/restart";
import type { Project } from "@/model/project";

function video(overrides: Partial<Project> = {}): Project {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "user_1",
    projectId: new ObjectId(),
    skillId: new ObjectId(),
    skillSlug: "story-short-director",
    source: "A story",
    aspectRatio: "9:16",
    durationPreset: "short",
    status: "production",
    clips: [],
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test("restart is blocked while the director or any media job is running", () => {
  assert.equal(restartBlockReason(video()), null);
  assert.equal(restartBlockReason(video({ status: "ready" })), null);
  assert.equal(restartBlockReason(video({ status: "failed" })), null);
  assert.match(restartBlockReason(video({ status: "phase_a" })) || "", /請等/);
  assert.match(
    restartBlockReason(
      video({ frames: [{ clipNumber: 1, position: "start", prompt: "p", status: "in_progress" }] }),
    ) || "",
    /請等/,
  );
  assert.match(
    restartBlockReason(
      video({ clips: [{ clipNumber: 1, durationSeconds: 5, prompt: "p", status: "queued" }] }),
    ) || "",
    /請等/,
  );
  assert.match(restartBlockReason(video({ reelStatus: "in_progress" })) || "", /請等/);
  assert.match(restartBlockReason(video({ finalStatus: "queued" })) || "", /請等/);
  assert.equal(restartBlockReason(video({ reelStatus: "completed", finalStatus: "failed" })), null);
});

test("restart deletes generated media but keeps the uploaded character image", () => {
  const urls = restartBlobUrls(
    video({
      characterImageUrl: "https://blob/upload.png",
      characterStillUrl: "https://blob/still.png",
      reelUrl: "https://blob/reel.mp4",
      finalUrl: "https://blob/final.mp4",
      frames: [
        {
          clipNumber: 1,
          position: "start",
          prompt: "p",
          status: "completed",
          blobUrl: "https://blob/f1.png",
          revision: { annotatedUrl: "https://blob/ann.png" },
        },
      ],
      clips: [
        { clipNumber: 1, durationSeconds: 5, prompt: "p", status: "completed", blobUrl: "https://blob/c1.mp4" },
      ],
    }),
    [{ blobUrl: "https://blob/job.png" }],
  );
  assert.deepEqual(new Set(urls), new Set([
    "https://blob/still.png",
    "https://blob/reel.mp4",
    "https://blob/final.mp4",
    "https://blob/f1.png",
    "https://blob/ann.png",
    "https://blob/c1.mp4",
    "https://blob/job.png",
  ]));
});

test("restart clears storyboard and every generated output field", () => {
  for (const field of [
    "phaseA",
    "phaseB",
    "frames",
    "characterStillUrl",
    "stillError",
    "autoVideoClips",
    "framesSubmittedAt",
    "reelUrl",
    "reelStatus",
    "reelFingerprint",
    "reelError",
    "reelAttempts",
    "finalUrl",
    "finalStatus",
    "finalFingerprint",
    "finalError",
    "finalQueuedAt",
    "error",
  ]) {
    assert.ok(field in RESTART_UNSET_FIELDS, `missing ${field}`);
  }
  assert.ok(!("characterImageUrl" in RESTART_UNSET_FIELDS));
  assert.ok(!("edit" in RESTART_UNSET_FIELDS));
});

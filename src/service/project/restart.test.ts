import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  RESTART_UNSET_FIELDS,
  restartBlobUrls,
  restartBlockReason,
  restartRefundFor,
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

test("restart is blocked while the director, a clip video, or an export is running", () => {
  assert.equal(restartBlockReason(video()), null);
  assert.equal(restartBlockReason(video({ status: "ready" })), null);
  assert.equal(restartBlockReason(video({ status: "failed" })), null);
  assert.match(restartBlockReason(video({ status: "phase_a" })) || "", /請等/);
  assert.match(
    restartBlockReason(
      video({
        clips: [{ clipNumber: 1, durationSeconds: 5, prompt: "p", status: "completed", outputUrl: "u" }],
      }),
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

test("restart is allowed while scene images and locks are still generating", () => {
  assert.equal(
    restartBlockReason(
      video({
        frames: [
          { clipNumber: 1, position: "start", prompt: "p", status: "in_progress" },
          { clipNumber: 2, position: "start", prompt: "p", status: "queued" },
        ],
        objectSheetItems: [{ name: "cup", notes: "" }],
        backgroundPlates: [{ setId: "set", clipNumbers: [1, 2], prompt: "p" } as never],
      }),
    ),
    null,
  );
  assert.equal(
    restartBlockReason(
      video({
        clips: [
          { clipNumber: 1, durationSeconds: 5, prompt: "p", status: "completed", blobUrl: "b" },
          { clipNumber: 2, durationSeconds: 5, prompt: "p", status: "failed" },
        ],
      }),
    ),
    null,
  );
});

test("restart refunds a frame cost, or what the subtitle plate charged", () => {
  const source = video({ subtitlePlates: [{ clipNumber: 2, status: "in_progress", creditsCharged: 3 }] });
  assert.equal(restartRefundFor(source, { kind: "frame", clipIndex: 0 }, 1), 1);
  assert.equal(restartRefundFor(source, { kind: "backgroundPlate", clipIndex: 0 }, 1), 1);
  assert.equal(restartRefundFor(source, { kind: "subtitlePlate", clipIndex: 1 }, 1), 3);
  assert.equal(restartRefundFor(source, { kind: "subtitlePlate", clipIndex: 4 }, 1), 1);
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
          mergedUrl: "https://blob/f1-merged.png",
          revision: { annotatedUrl: "https://blob/ann.png" },
        },
      ],
      clips: [
        { clipNumber: 1, durationSeconds: 5, prompt: "p", status: "completed", blobUrl: "https://blob/c1.mp4" },
      ],
    }),
    [{ blobUrl: "https://blob/job.png" }],
    [{ sourceUrl: "https://blob/explainer/v1/opencut/edit-media.mp4" }],
  );
  assert.deepEqual(new Set(urls), new Set([
    "https://blob/still.png",
    "https://blob/reel.mp4",
    "https://blob/final.mp4",
    "https://blob/f1.png",
    "https://blob/f1-merged.png",
    "https://blob/ann.png",
    "https://blob/c1.mp4",
    "https://blob/job.png",
    "https://blob/explainer/v1/opencut/edit-media.mp4",
  ]));
});

test("restart clears storyboard and every generated output field", () => {
  for (const field of [
    "phaseA",
    "phaseB",
    "frames",
    "characterStillUrl",
    "stillError",
    "objectSheetItems",
    "objectSheetUrl",
    "objectSheetError",
    "lockRevision",
    "backgroundPlates",
    "backgroundPlateError",
    "autoVideoClips",
    "framesSubmittedAt",
    "reelUrl",
    "reelStatus",
    "reelFingerprint",
    "reelError",
    "reelStep",
    "reelAttempts",
    "finalUrl",
    "finalStatus",
    "finalFingerprint",
    "finalError",
    "finalQueuedAt",
    "postedAt",
    "archivedAt",
    "error",
  ]) {
    assert.ok(field in RESTART_UNSET_FIELDS, `missing ${field}`);
  }
  assert.ok(!("characterImageUrl" in RESTART_UNSET_FIELDS));
  assert.ok(!("edit" in RESTART_UNSET_FIELDS));
});

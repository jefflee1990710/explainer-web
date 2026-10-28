import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import {
  collectClipVideoBlobUrls,
  collectFrameBlobUrls,
  collectSubtitlePlateBlobUrls,
  collectVideoBlobUrls,
} from "@/service/video/storage";

function makeProject(overrides: Partial<Project> = {}): Project {
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

test("collectVideoBlobUrls includes frame mergedUrl and opencut edit media urls", () => {
  const project = makeProject({
    frames: [
      {
        clipNumber: 1,
        position: "start",
        prompt: "p",
        status: "completed",
        blobUrl: "https://blob/f1-raw.png",
        mergedUrl: "https://blob/f1-merged.png",
        revision: { annotatedUrl: "https://blob/f1-ann.png" },
      },
    ],
    clips: [
      {
        clipNumber: 1,
        durationSeconds: 5,
        prompt: "p",
        status: "completed",
        blobUrl: "https://blob/c1.mp4",
      },
    ],
  });

  const otherVideoId = new ObjectId().toHexString();
  const urls = collectVideoBlobUrls(
    project,
    [{ blobUrl: "https://blob/job1.png" }],
    [
      { sourceUrl: "https://blob/explainer/v1/opencut/m1.mp4" },
      { sourceUrl: `https://blob/explainer/${project._id.toHexString()}/clips/own.mp4` },
      { sourceUrl: `https://blob/explainer/${otherVideoId}/clips/shared-bookend.mp4` },
    ],
  );

  assert.deepEqual(
    new Set(urls),
    new Set([
      "https://blob/f1-raw.png",
      "https://blob/f1-merged.png",
      "https://blob/f1-ann.png",
      "https://blob/c1.mp4",
      "https://blob/job1.png",
      "https://blob/explainer/v1/opencut/m1.mp4",
      `https://blob/explainer/${project._id.toHexString()}/clips/own.mp4`,
    ]),
  );
});

test("collectFrameBlobUrls collects old frame images, merged images, and job blobs for target clips while preserving kept urls", () => {
  const project = makeProject({
    frames: [
      {
        clipNumber: 1,
        position: "start",
        prompt: "p1",
        status: "completed",
        blobUrl: "https://blob/f1-start.png",
        mergedUrl: "https://blob/f1-merged.png",
        revision: { annotatedUrl: "https://blob/f1-old-ann.png" },
      },
      {
        clipNumber: 1,
        position: "end",
        prompt: "p1-end",
        status: "completed",
        blobUrl: "https://blob/f1-end.png",
      },
      {
        clipNumber: 2,
        position: "start",
        prompt: "p2",
        status: "completed",
        blobUrl: "https://blob/f2-start.png",
      },
    ],
  });

  // Regenerating clip 1 start only, with a new revision annotatedUrl that must be kept
  const singleUrls = collectFrameBlobUrls(
    project.frames,
    [{ clipNumber: 1, position: "start" }],
    [{ blobUrl: "https://blob/f1-job.png" }],
    ["https://blob/f1-new-ann.png"],
  );
  assert.deepEqual(
    new Set(singleUrls),
    new Set([
      "https://blob/f1-start.png",
      "https://blob/f1-merged.png",
      "https://blob/f1-old-ann.png",
      "https://blob/f1-job.png",
    ]),
  );

  // Regenerating all frames of clip 1 (e.g. enqueueClipFrameJobs) collects both start and legacy end
  const clipUrls = collectFrameBlobUrls(
    project.frames,
    [{ clipNumber: 1 }],
    [{ blobUrl: "https://blob/f1-job.png" }],
  );
  assert.deepEqual(
    new Set(clipUrls),
    new Set([
      "https://blob/f1-start.png",
      "https://blob/f1-merged.png",
      "https://blob/f1-old-ann.png",
      "https://blob/f1-end.png",
      "https://blob/f1-job.png",
    ]),
  );
});

test("collectClipVideoBlobUrls collects old clip video blobs, job blobs, and stale reel/final urls", () => {
  const project = makeProject({
    reelUrl: "https://blob/reel.mp4",
    finalUrl: "https://blob/final.mp4",
    clips: [
      {
        clipNumber: 1,
        durationSeconds: 5,
        prompt: "p1",
        status: "completed",
        blobUrl: "https://blob/c1-old.mp4",
      },
      {
        clipNumber: 2,
        durationSeconds: 5,
        prompt: "p2",
        status: "completed",
        blobUrl: "https://blob/c2-keep.mp4",
      },
    ],
  });

  const urls = collectClipVideoBlobUrls(
    project,
    [1],
    [{ blobUrl: "https://blob/c1-job.mp4" }],
  );

  assert.deepEqual(
    new Set(urls),
    new Set([
      "https://blob/c1-old.mp4",
      "https://blob/c1-job.mp4",
      "https://blob/reel.mp4",
      "https://blob/final.mp4",
    ]),
  );
});

test("collectSubtitlePlateBlobUrls collects old plate blobs, job blobs, and frame mergedUrl for target clips", () => {
  const project = makeProject({
    subtitlePlates: [
      { clipNumber: 1, status: "completed", blobUrl: "https://blob/plate-1.png" },
      { clipNumber: 2, status: "completed", blobUrl: "https://blob/plate-2.png" },
    ],
    frames: [
      {
        clipNumber: 1,
        position: "start",
        prompt: "p1",
        status: "completed",
        blobUrl: "https://blob/f1-raw.png",
        mergedUrl: "https://blob/f1-merged.png",
      },
    ],
  });

  const urls = collectSubtitlePlateBlobUrls(
    project,
    [1],
    [{ blobUrl: "https://blob/plate-1-job.png" }],
  );

  assert.deepEqual(
    new Set(urls),
    new Set([
      "https://blob/plate-1.png",
      "https://blob/plate-1-job.png",
      "https://blob/f1-merged.png",
    ]),
  );
});

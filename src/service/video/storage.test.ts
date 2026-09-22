import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { collectVideoBlobUrls } from "@/service/video/storage";
import type { Project } from "@/model/project";

const still = "https://blob/still.webp";
const frameStart = "https://blob/start.webp";
const annotated = "https://blob/annotated.png";
const clip = "https://blob/clip.mp4";
const reel = "https://blob/reel.mp4";
const jobBlob = "https://blob/job.webp";

test("collectVideoBlobUrls gathers frames, clips, reel, and job blobs", () => {
  const video = {
    _id: new ObjectId(),
    characterStillUrl: still,
    characterImageUrl: still,
    reelUrl: reel,
    frames: [
      { blobUrl: frameStart, revision: { annotatedUrl: annotated } },
      { blobUrl: frameStart },
    ],
    clips: [{ blobUrl: clip }, { blobUrl: undefined }],
  } as Project;

  assert.deepEqual(
    collectVideoBlobUrls(video, [{ blobUrl: jobBlob }, { blobUrl: frameStart }]).sort(),
    [still, frameStart, annotated, clip, reel, jobBlob].sort(),
  );
});

test("collectVideoBlobUrls ignores character cast blueprints", () => {
  const video = {
    _id: new ObjectId(),
    frames: [],
    clips: [],
    cast: [{ blueprintUrl: "https://blob/character-blueprint.webp" }],
  } as unknown as Project;

  assert.deepEqual(collectVideoBlobUrls(video), []);
});

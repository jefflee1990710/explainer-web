import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { projectSchema, type Project } from "@/model/project";
import { toPublicVideo } from "@/presentation/serialize";

test("projectSchema validates onScreenTextStyleId and onScreenTextCoverage", () => {
  const parsed = projectSchema.parse({
    _id: new ObjectId("673200000000000000000001"),
    userId: new ObjectId("673200000000000000000003"),
    projectId: new ObjectId("673200000000000000000002"),
    skillId: new ObjectId("673200000000000000000004"),
    skillSlug: "explainer",
    clerkUserId: "user_test",
    source: "Test explainer",
    aspectRatio: "16:9",
    durationPreset: "short",
    status: "draft",
    clips: [],
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
  });
  assert.equal(parsed.onScreenTextStyleId, "clean");
  assert.equal(parsed.onScreenTextCoverage, "hook");
});

test("toPublicVideo serializes onScreenTextStyleId and onScreenTextCoverage", () => {
  const publicVideo = toPublicVideo({
    _id: new ObjectId("673200000000000000000001"),
    userId: new ObjectId("673200000000000000000003"),
    projectId: new ObjectId("673200000000000000000002"),
    skillId: new ObjectId("673200000000000000000004"),
    clerkUserId: "user_test",
    source: "Test explainer",
    status: "draft",
    skillSlug: "explainer",
    aspectRatio: "16:9",
    durationPreset: "short",
    clips: [],
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    onScreenTextStyleId: "neon",
    onScreenTextCoverage: "all",
  } as unknown as Project);
  assert.equal(publicVideo.onScreenTextStyleId, "neon");
  assert.equal(publicVideo.onScreenTextCoverage, "all");
});

test("toPublicVideo shows the painted clip when the stored file is still the base", () => {
  const publicVideo = toPublicVideo({
    _id: new ObjectId("673200000000000000000001"),
    userId: new ObjectId("673200000000000000000003"),
    projectId: new ObjectId("673200000000000000000002"),
    skillId: new ObjectId("673200000000000000000004"),
    clerkUserId: "user_test",
    source: "Test explainer",
    status: "production",
    skillSlug: "paper-cutout-explainer-video-director",
    aspectRatio: "9:16",
    durationPreset: "short",
    clips: [
      {
        clipNumber: 1,
        durationSeconds: 6,
        prompt: "v",
        status: "completed",
        blobUrl: "https://blob/original.mp4",
        outputUrl: "https://openrouter.ai/api/v1/videos/gen/content",
      },
    ],
    onscreenTexts: [
      {
        id: "line",
        text: "90% of creators do not realize",
        textStyleId: "clean",
        status: "completed",
        clipIndex: 0,
        baseVideoUrl: "https://blob/original.mp4",
        inpaintedVideoUrl: "https://blob/inpaint.mp4",
      },
    ],
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Project);
  assert.equal(publicVideo.clips[0]?.blobUrl, "https://blob/inpaint.mp4");
  assert.equal(publicVideo.clips[0]?.outputUrl, "https://blob/inpaint.mp4");
});

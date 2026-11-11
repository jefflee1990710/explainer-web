import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { projectSchema } from "@/model/project";
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
  } as any);
  assert.equal(publicVideo.onScreenTextStyleId, "neon");
  assert.equal(publicVideo.onScreenTextCoverage, "all");
});

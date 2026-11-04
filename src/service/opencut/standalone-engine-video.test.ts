import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { projectSchema } from "@/model/project";
import {
  applyStandaloneEngineFrameToProject,
  buildStandaloneEngineProjectDoc,
  isStandaloneEngineSkillSlug,
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-video";
import { shouldOpenVideoDesk } from "@/service/project-status";
import { buildSeedClips } from "@/service/scro-video/timeline-seed";

test("buildStandaloneEngineProjectDoc creates a 1-clip Project that opens directly in OpenCut", () => {
  const userId = new ObjectId();
  const doc = buildStandaloneEngineProjectDoc({
    userId,
    clerkUserId: "user_1",
    kind: "scroswap",
    title: "Scro Swap · Alice",
    sourceVideoUrl: "https://blob.vercel-storage.com/src.mp4",
    aspectRatio: "9:16",
    durationSeconds: 6,
    posterUrl: "https://blob.vercel-storage.com/start.webp",
    status: "rendering",
  });

  projectSchema.parse(doc);
  assert.equal(doc.skillSlug, SCRO_SWAP_STANDALONE_SKILL_SLUG);
  assert.equal(isStandaloneEngineSkillSlug(doc.skillSlug), true);
  assert.equal(isStandaloneEngineSkillSlug(TELEPORT_STANDALONE_SKILL_SLUG), true);
  assert.equal(isStandaloneEngineSkillSlug("talking-head-director"), false);
  assert.equal(shouldOpenVideoDesk(doc, 1), true);

  const seeds = buildSeedClips(doc);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0]?.clipNumber, 1);
  assert.equal(seeds[0]?.stage, "video_generating");
  assert.equal(seeds[0]?.posterUrl, "https://blob.vercel-storage.com/start.webp");
});

test("buildStandaloneEngineProjectDoc marks completed job as ready with video_ready seed clip", () => {
  const doc = buildStandaloneEngineProjectDoc({
    userId: new ObjectId(),
    clerkUserId: "user_1",
    kind: "teleport",
    title: "Teleport · Neon Street",
    sourceVideoUrl: "https://blob.vercel-storage.com/src.mp4",
    aspectRatio: "16:9",
    durationSeconds: 8,
    posterUrl: "https://blob.vercel-storage.com/prepared.webp",
    outputVideoUrl: "https://blob.vercel-storage.com/out.mp4",
    status: "completed",
  });

  projectSchema.parse(doc);
  assert.equal(doc.status, "ready");
  const seeds = buildSeedClips(doc);
  assert.equal(seeds[0]?.stage, "video_ready");
  assert.equal(seeds[0]?.videoUrl, "https://blob.vercel-storage.com/out.mp4");
});

test("applyStandaloneEngineFrameToProject syncs posterUrl, aspectRatio, and duration without marking video stale", () => {
  const initial = buildStandaloneEngineProjectDoc({
    userId: new ObjectId(),
    clerkUserId: "user_1",
    kind: "scroswap",
    title: "Scro Swap · Bob",
    sourceVideoUrl: "https://blob.vercel-storage.com/src.mp4",
    aspectRatio: "9:16",
    durationSeconds: 6,
    status: "rendering",
    now: new Date("2026-11-05T10:00:00.000Z"),
  });

  // Before frame sync: still video_generating
  const beforeSeeds = buildSeedClips(initial);
  assert.equal(beforeSeeds[0]?.stage, "video_generating");
  assert.equal(beforeSeeds[0]?.posterUrl, undefined);

  const patch = applyStandaloneEngineFrameToProject(initial, {
    clipNumber: 1,
    aspectRatio: "16:9",
    durationSeconds: 10,
    posterUrl: "https://blob.vercel-storage.com/prepared-start.webp",
    now: new Date("2026-11-05T10:00:20.000Z"),
  });

  const synced = { ...initial, ...patch };
  assert.equal(synced.aspectRatio, "16:9");
  assert.equal(synced.phaseA?.aspectRatio, "16:9");
  assert.equal(synced.phaseA?.clips[0]?.durationSeconds, 10);
  assert.equal(synced.clips[0]?.durationSeconds, 10);

  const afterSeeds = buildSeedClips(synced);
  assert.equal(afterSeeds[0]?.stage, "video_generating");
  assert.equal(afterSeeds[0]?.posterUrl, "https://blob.vercel-storage.com/prepared-start.webp");
  assert.equal(afterSeeds[0]?.staleVideo, false);

  // Non-standalone Studio video preserves its parent aspectRatio
  const studioDoc = { ...initial, skillSlug: "talking-head-director", aspectRatio: "9:16" as const };
  const studioPatch = applyStandaloneEngineFrameToProject(studioDoc, {
    clipNumber: 1,
    aspectRatio: "16:9",
    posterUrl: "https://blob.vercel-storage.com/prepared-start.webp",
  });
  assert.equal(studioPatch.aspectRatio, "9:16");
});

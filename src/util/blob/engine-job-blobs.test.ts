import assert from "node:assert/strict";
import test from "node:test";
import {
  collectExtendJobAllBlobUrls,
  collectExtendJobTransientBlobUrls,
  collectJutsuJobAllBlobUrls,
  collectJutsuJobTransientBlobUrls,
  collectTeleportJobAllBlobUrls,
  collectTeleportJobTransientBlobUrls,
} from "@/util/blob/engine-job-blobs";

test("collectJutsuJobTransientBlobUrls only returns intermediate blobs and keeps poster + final outputs", () => {
  const job = {
    sourceVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/brand/u1/src.mp4",
    referenceImageUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/c1/standing.png",
    rawStartFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/raw-start.webp",
    rawEndFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/raw-end.webp",
    preparedStartFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/prep-start.webp",
    preparedEndFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/prep-end.webp",
    mannequinVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/mannequin.mp4",
    maskVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/mask.mp4",
    sectionAudioUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/audio.mp3",
    outputVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/final.mp4",
    outputGifUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/u1/j1/final.gif",
  };

  const transient = collectJutsuJobTransientBlobUrls(job);
  assert.deepEqual(transient, [
    job.rawEndFrameUrl,
    job.preparedEndFrameUrl,
    job.mannequinVideoUrl,
    job.maskVideoUrl,
    job.sectionAudioUrl,
    job.rawStartFrameUrl,
  ]);
  assert.ok(!transient.includes(job.preparedStartFrameUrl));
  assert.ok(!transient.includes(job.outputVideoUrl));
  assert.ok(!transient.includes(job.sourceVideoUrl));
  assert.ok(!transient.includes(job.referenceImageUrl));

  const all = collectJutsuJobAllBlobUrls(job);
  assert.ok(all.includes(job.preparedStartFrameUrl));
  assert.ok(all.includes(job.outputVideoUrl));
  assert.ok(all.includes(job.outputGifUrl));
  // Never delete character reference or shared brand source video unless explicitly owned
  assert.ok(!all.includes(job.referenceImageUrl));
});

test("collectTeleportJobTransientBlobUrls and collectTeleportJobAllBlobUrls respect scenePlateGenerated", () => {
  const job = {
    sourceVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/src.mp4",
    sceneImageUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/scene-plate.webp",
    scenePlateGenerated: true,
    rawStartFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/raw-start.webp",
    rawEndFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/raw-end.webp",
    identityFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/identity.webp",
    mannequinVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/mannequin.mp4",
    sectionAudioUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/section-audio.mp3",
    preparedStartFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/prepared-start.webp",
    preparedEndFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/prepared-end.webp",
    outputVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/teleport/u1/t1/output.mp4",
  };

  const transient = collectTeleportJobTransientBlobUrls(job);
  assert.deepEqual(transient, [
    job.rawEndFrameUrl,
    job.preparedEndFrameUrl,
    job.identityFrameUrl,
    job.mannequinVideoUrl,
    job.sectionAudioUrl,
    job.rawStartFrameUrl,
  ]);

  const allGeneratedScene = collectTeleportJobAllBlobUrls(job);
  assert.ok(allGeneratedScene.includes(job.sceneImageUrl));
  assert.ok(allGeneratedScene.includes(job.outputVideoUrl));

  const allUserScene = collectTeleportJobAllBlobUrls({ ...job, scenePlateGenerated: false });
  assert.ok(!allUserScene.includes(job.sceneImageUrl));
});

test("collectExtendJobTransientBlobUrls and collectExtendJobAllBlobUrls handle tailFrameUrl and outputVideoUrl", () => {
  const job = {
    tailFrameUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/extend/u1/e1/tail-frame.jpg",
    outputVideoUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/extend/u1/e1/output.mp4",
  };
  assert.deepEqual(collectExtendJobTransientBlobUrls(job), [job.tailFrameUrl]);
  assert.deepEqual(collectExtendJobAllBlobUrls(job), [job.tailFrameUrl, job.outputVideoUrl]);
});

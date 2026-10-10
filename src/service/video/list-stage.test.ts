import assert from "node:assert/strict";
import { test } from "node:test";
import type { GenerationDetailTag } from "@/service/clip-stage";
import { videoListStage } from "@/service/video/list-stage";

const scene = (state: GenerationDetailTag["state"]): GenerationDetailTag => ({
  clipNumber: 1,
  kind: "scene",
  state,
});
const video = (state: GenerationDetailTag["state"]): GenerationDetailTag => ({
  clipNumber: 1,
  kind: "video",
  state,
});

test("the director writing, or a failed plan, is director planning", () => {
  assert.equal(videoListStage({ status: "phase_a", tags: [] }), "director");
  assert.equal(videoListStage({ status: "draft", tags: [] }), "director");
  assert.equal(videoListStage({ status: "failed", tags: [] }), "director");
});

test("scene images that are running or not finished stay in scene generating", () => {
  assert.equal(
    videoListStage({ status: "production", tags: [scene("busy"), video("pending")] }),
    "scenes",
  );
  assert.equal(
    videoListStage({ status: "production", tags: [scene("pending"), video("pending")] }),
    "scenes",
  );
});

test("a clip video in flight is video generating, even if it was posted before", () => {
  assert.equal(
    videoListStage({
      status: "production",
      tags: [scene("ready"), video("busy")],
      postedAt: "2026-01-01T00:00:00.000Z",
    }),
    "videos",
  );
});

test("images done and the video not started is pending video", () => {
  assert.equal(
    videoListStage({ status: "production", tags: [scene("ready"), video("pending")] }),
    "pending_video",
  );
  assert.equal(
    videoListStage({ status: "production", tags: [scene("ready"), video("failed")] }),
    "pending_video",
  );
});

test("a finished video is pending to post until the user marks it posted", () => {
  const tags = [scene("ready"), video("ready")];
  assert.equal(videoListStage({ status: "ready", tags }), "pending_post");
  assert.equal(
    videoListStage({ status: "ready", tags, postedAt: "2026-01-01T00:00:00.000Z" }),
    "posted",
  );
});

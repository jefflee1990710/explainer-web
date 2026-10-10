import assert from "node:assert/strict";
import test from "node:test";
import type { StoryboardRow } from "@/model/project";
import {
  applyEndSceneRewrites,
  endSceneRewritePrompt,
  rewriteEndScenes,
  shouldRewriteEndScenes,
} from "@/service/director/end-scene-rewrite";

function clip(partial: Partial<StoryboardRow> & Pick<StoryboardRow, "clipNumber">): StoryboardRow {
  return {
    timeRange: "0-5s",
    durationSeconds: 5,
    narrativeJob: "job",
    explainerScene: "scene",
    motionCamera: "camera pushes in",
    englishVo: "line",
    bgmSfx: "none",
    ...partial,
  };
}

test("end stills use the stronger model except directors that already own the camera", () => {
  assert.equal(shouldRewriteEndScenes("story-short-director"), true);
  assert.equal(shouldRewriteEndScenes("cartoon-explainer-video-director"), true);
  assert.equal(shouldRewriteEndScenes("talking-head-director"), false);
  assert.equal(shouldRewriteEndScenes("full-body-talking-head-director"), false);
  assert.equal(shouldRewriteEndScenes("outfit-reel-director"), false);
  assert.equal(shouldRewriteEndScenes("surprise-interview-director"), false);
});

test("the end-scene prompt includes the opening still and the camera motion", () => {
  const prompt = endSceneRewritePrompt([
    clip({
      clipNumber: 1,
      startScene: "Camera: wide shot from the left.",
      motionCamera: "0–2s the camera pushes in; 2–5s it settles on a close-up.",
      endScene: "the mug is centered.",
    }),
  ]);
  assert.match(prompt, /startScene:\nCamera: wide shot from the left/);
  assert.match(prompt, /motionCamera:\n0–2s the camera pushes in/);
  assert.match(prompt, /draft endScene:\nthe mug is centered/);
});

test("a rewrite replaces the end still and keeps a clip the model skipped", () => {
  const clips = [
    clip({ clipNumber: 1, startScene: "wide", endScene: "old end" }),
    clip({ clipNumber: 2, startScene: "side", endScene: "keep me" }),
  ];
  const next = applyEndSceneRewrites(clips, [
    { clipNumber: 1, endScene: "close-up from the front" },
    { clipNumber: 2, endScene: "  " },
  ]);
  assert.equal(next[0]?.endScene, "close-up from the front");
  assert.equal(next[1]?.endScene, "keep me");
});

test("a dual-beat rewrite keeps the joined scene in sync", () => {
  const clips = [
    clip({
      clipNumber: 1,
      startScene: "holds the ruler",
      endScene: "old",
      explainerScene: "起始：holds the ruler。結尾：old",
    }),
  ];
  const next = applyEndSceneRewrites(clips, [{ clipNumber: 1, endScene: "ruler is a line" }], {
    dualBeat: true,
  });
  assert.equal(next[0]?.endScene, "ruler is a line");
  assert.match(next[0]?.explainerScene || "", /ruler is a line/);
});

test("rewrite calls the model once and a failure keeps the draft", async () => {
  const clips = [clip({ clipNumber: 1, endScene: "draft" })];
  let calls = 0;
  const next = await rewriteEndScenes({ clips, skillSlug: "story-short-director" }, async () => {
    calls += 1;
    return { clips: [{ clipNumber: 1, endScene: "landed close-up" }] };
  });
  assert.equal(calls, 1);
  assert.equal(next[0]?.endScene, "landed close-up");

  const kept = await rewriteEndScenes({ clips, skillSlug: "story-short-director" }, async () => {
    throw new Error("down");
  });
  assert.equal(kept[0]?.endScene, "draft");

  let skipped = 0;
  const talking = await rewriteEndScenes({ clips, skillSlug: "talking-head-director" }, async () => {
    skipped += 1;
    return { clips: [] };
  });
  assert.equal(skipped, 0);
  assert.equal(talking[0]?.endScene, "draft");
});

test("a follow shot copies the new end into the next opening", async () => {
  const clips = [
    clip({ clipNumber: 1, startScene: "walks in", endScene: "old end" }),
    clip({ clipNumber: 2, startScene: "old end", endScene: "stops" }),
  ];
  const next = await rewriteEndScenes({ clips, skillSlug: "follow-shot-director" }, async () => ({
    clips: [{ clipNumber: 1, endScene: "reaches the door" }],
  }));
  assert.equal(next[0]?.endScene, "reaches the door");
  assert.equal(next[1]?.startScene, "reaches the door");
});

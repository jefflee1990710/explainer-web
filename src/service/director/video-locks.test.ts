import assert from "node:assert/strict";
import test from "node:test";
import type { StoryboardRow } from "@/model/project";
import {
  applyVideoLocksToClips,
  normalizeVideoLocks,
  planVideoLocks,
  shouldPlanVideoLocks,
  videoLocksFingerprint,
  videoLocksPrompt,
  videoLocksSystem,
} from "@/service/director/video-locks";

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

test("talking-head skips video locks; others plan them", () => {
  assert.equal(shouldPlanVideoLocks("talking-head-director"), false);
  assert.equal(shouldPlanVideoLocks("cartoon-explainer-video-director"), true);
});

test("the locks prompt includes each clip's stills and motion", () => {
  const prompt = videoLocksPrompt([
    clip({
      clipNumber: 1,
      startScene: "Set: Rooftop. Camera: left profile.",
      endScene: "Set: Rooftop. Camera: right 3/4.",
      motionCamera: "arc sweeps 180 degrees",
    }),
  ]);
  assert.match(prompt, /startScene:\nSet: Rooftop/);
  assert.match(prompt, /endScene:\nSet: Rooftop/);
  assert.match(prompt, /motionCamera:\narc sweeps/);
  assert.match(videoLocksSystem(), /At most 8 objects/);
});

test("normalize merges skipped clips onto a set and caps counts", () => {
  const clips = [clip({ clipNumber: 1 }), clip({ clipNumber: 2 }), clip({ clipNumber: 3 })];
  const plan = normalizeVideoLocks(clips, {
    objects: [
      { name: "gimbal", notes: "metal dial" },
      { name: "  ", notes: "drop" },
    ],
    sets: [{ setId: "Rooftop View", name: "rooftop", notes: "city sky", clipNumbers: [1, 2] }],
  });
  assert.deepEqual(plan.objects, [{ name: "gimbal", notes: "metal dial" }]);
  assert.equal(plan.sets[0]?.setId, "rooftop-view");
  assert.deepEqual(plan.sets[0]?.clipNumbers, [1, 2, 3]);
});

test("apply writes backgroundSetId onto each clip", () => {
  const clips = [clip({ clipNumber: 1 }), clip({ clipNumber: 2, backgroundSetId: "old" })];
  const next = applyVideoLocksToClips(clips, [
    { setId: "desk", name: "desk", notes: "wood", clipNumbers: [1] },
  ]);
  assert.equal(next[0]?.backgroundSetId, "desk");
  assert.equal(next[1]?.backgroundSetId, undefined);
});

test("fingerprint changes when props or places change", () => {
  const a = videoLocksFingerprint({
    objects: [{ name: "cup", notes: "red" }],
    sets: [{ setId: "a", name: "desk", notes: "day", clipNumbers: [1] }],
  });
  const b = videoLocksFingerprint({
    objects: [{ name: "cup", notes: "blue" }],
    sets: [{ setId: "a", name: "desk", notes: "day", clipNumbers: [1] }],
  });
  assert.notEqual(a, b);
});

test("planVideoLocks calls the model once and failures return empty locks", async () => {
  let calls = 0;
  const next = await planVideoLocks(
    { clips: [clip({ clipNumber: 1 })], skillSlug: "story-short-director" },
    async () => {
      calls += 1;
      return {
        objects: [{ name: "mug", notes: "ceramic" }],
        sets: [{ setId: "cafe", name: "cafe", notes: "window light", clipNumbers: [1] }],
      };
    },
  );
  assert.equal(calls, 1);
  assert.equal(next.objects[0]?.name, "mug");
  assert.equal(next.sets[0]?.setId, "cafe");

  const kept = await planVideoLocks(
    { clips: [clip({ clipNumber: 1 })], skillSlug: "story-short-director" },
    async () => {
      throw new Error("down");
    },
  );
  assert.deepEqual(kept, { objects: [], sets: [] });

  let skipped = 0;
  const talking = await planVideoLocks(
    { clips: [clip({ clipNumber: 1 })], skillSlug: "talking-head-director" },
    async () => {
      skipped += 1;
      return { objects: [], sets: [] };
    },
  );
  assert.equal(skipped, 0);
  assert.deepEqual(talking, { objects: [], sets: [] });
});

import assert from "node:assert/strict";
import test from "node:test";
import type { StoryboardRow } from "@/model/project";
import {
  applyVideoLocksToClips,
  fillMissingSceneProps,
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

test("only the 6 designated directors plan video locks (prop sheet and background plate)", () => {
  for (const slug of [
    "story-short-director",
    "product-demo-director",
    "talking-head-director",
    "outfit-reel-director",
    "style-switch-director",
    "street-lookbook-director",
  ]) {
    assert.equal(shouldPlanVideoLocks(slug), true, `expected ${slug} to plan video locks`);
  }
  for (const slug of [
    "cartoon-explainer-video-director",
    "paper-cutout-explainer-video-director",
    "listicle-director",
    "comparison-card-director",
    "tutorial-director",
    "workflow-promo-director",
    "dialogue-qa-director",
    "talking-broll-director",
    "editorial-interview-director",
    "outfit-change-director",
    "follow-shot-director",
    "opening-director",
    "ending-director",
    "full-body-talking-head-director",
    "surprise-interview-director",
    undefined,
  ]) {
    assert.equal(shouldPlanVideoLocks(slug), false, `expected ${slug} to skip video locks`);
  }
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
  assert.match(videoLocksSystem(), /every distinct prop/);
  assert.match(videoLocksSystem(), /whiteboard/);
  assert.match(videoLocksSystem(), /Do not describe screen content/);
});

test("a writing surface named in the scenes becomes Whiteboard on the sheet", () => {
  const clips = [
    clip({
      clipNumber: 1,
      startScene: "Set: rooftop with an easel chart 「5 MOTIONS」.",
      endScene: "Set: rooftop, marker on the board.",
      motionCamera: "taps the board",
    }),
  ];
  const filled = fillMissingSceneProps(clips, [
    { name: "Easel Presentation Chart", notes: "diagrams" },
    { name: "Black Felt Marker", notes: "pen" },
  ]);
  assert.equal(
    filled.some((item) => /whiteboard/i.test(item.name)),
    true,
  );
  assert.equal(
    filled.some((item) => /marker/i.test(item.name)),
    true,
  );
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

  const whiteboardPlan = normalizeVideoLocks(
    [
      clip({
        clipNumber: 1,
        startScene: "Set: whiteboard with chart and marker.",
        endScene: "Set: whiteboard with chart and marker.",
      }),
      clip({ clipNumber: 2 }),
      clip({ clipNumber: 3 }),
    ],
    {
      objects: [{ name: "Whiteboard", notes: "easel" }],
      sets: [
        { setId: "room-a", name: "room a", notes: "light", clipNumbers: [1] },
        { setId: "room-b", name: "room b", notes: "dark", clipNumbers: [2, 3] },
      ],
    },
    "cartoon-explainer-video-director",
  );
  assert.equal(whiteboardPlan.sets.length, 1);
  assert.deepEqual(whiteboardPlan.sets[0]?.clipNumbers, [1, 2, 3]);
  assert.equal(
    whiteboardPlan.objects.some((item) => /whiteboard|easel/i.test(item.name)),
    false,
  );
  assert.equal(
    whiteboardPlan.objects.some((item) => /marker/i.test(item.name)),
    true,
  );
  assert.match(videoLocksSystem("en", "cartoon-explainer-video-director"), /ONE single shared location/);
  assert.match(videoLocksSystem("en", "cartoon-explainer-video-director"), /flat 2D full-bleed whiteboard surface/);

  const talkingHeadPlan = normalizeVideoLocks(
    clips,
    {
      objects: [],
      sets: [
        { setId: "room-a", name: "room a", notes: "light", clipNumbers: [1] },
        { setId: "room-b", name: "room b", notes: "dark", clipNumbers: [2, 3] },
      ],
    },
    "talking-head-director",
  );
  assert.equal(talkingHeadPlan.sets.length, 1);
  assert.deepEqual(talkingHeadPlan.sets[0]?.clipNumbers, [1, 2, 3]);
  assert.match(videoLocksSystem("en", "talking-head-director"), /ONE single shared location/);
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

  let talkingCalls = 0;
  const talking = await planVideoLocks(
    { clips: [clip({ clipNumber: 1 })], skillSlug: "talking-head-director" },
    async () => {
      talkingCalls += 1;
      return {
        objects: [{ name: "mug", notes: "ceramic" }],
        sets: [{ setId: "sofa", name: "sofa", notes: "warm lamp", clipNumbers: [1] }],
      };
    },
  );
  assert.equal(talkingCalls, 1);
  assert.equal(talking.objects[0]?.name, "mug");
  assert.equal(talking.sets[0]?.setId, "sofa");

  let explainerCalls = 0;
  const explainer = await planVideoLocks(
    { clips: [clip({ clipNumber: 1 })], skillSlug: "cartoon-explainer-video-director" },
    async () => {
      explainerCalls += 1;
      return {
        objects: [{ name: "marker", notes: "felt" }],
        sets: [{ setId: "board", name: "board", notes: "flat", clipNumbers: [1] }],
      };
    },
  );
  assert.equal(explainerCalls, 0);
  assert.deepEqual(explainer, { objects: [], sets: [] });
});

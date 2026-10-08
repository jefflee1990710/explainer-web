import assert from "node:assert/strict";
import { test } from "node:test";
import type { StoryboardRow } from "@/model/project";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  applySceneChatEdits,
  clipWithSceneDraft,
  regenStoryboardInput,
  sceneDraftFromClip,
} from "@/service/clip/scene-chat";

function row(partial: Partial<StoryboardRow> = {}): StoryboardRow {
  return {
    clipNumber: 1,
    timeRange: "0-4s",
    durationSeconds: 4,
    narrativeJob: "hook",
    explainerScene: "Start: a desk. End: the same desk, closer.",
    motionCamera: "push in",
    englishVo: "Five tools.",
    bgmSfx: "",
    ...partial,
  };
}

test("scene draft reads a labeled single scene as start and end", () => {
  const draft = sceneDraftFromClip(row());
  assert.equal(draft.startScene, "a desk");
  assert.equal(draft.endScene, "the same desk, closer.");
  assert.equal(draft.motionCamera, "push in");
});

test("apply keeps untouched fields and rejects a blank start", () => {
  const draft = sceneDraftFromClip(row());
  const changed = applySceneChatEdits(draft, [
    { field: "motionCamera", content: "  crane up  " },
  ]);
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.deepEqual(changed.changed, ["motionCamera"]);
  assert.equal(changed.draft.startScene, draft.startScene);
  assert.equal(changed.draft.motionCamera, "crane up");

  const blank = applySceneChatEdits(draft, [{ field: "startScene", content: "   " }]);
  assert.equal(blank.ok, false);
});

test("a single-scene clip stores Start/End in explainerScene and drops split fields", () => {
  const clip = row({ startScene: "old start", endScene: "old end" });
  const next = clipWithSceneDraft(
    clip,
    { startScene: "overhead paper", endScene: "paper with a giant 5", motionCamera: "drop in" },
    "listicle-director",
  );
  assert.equal(next.startScene, undefined);
  assert.equal(next.endScene, undefined);
  assert.equal(next.explainerScene, "Start: overhead paper. End: paper with a giant 5");
  assert.equal(next.motionCamera, "drop in");
  assert.equal(next.englishVo, "Five tools.");
  const regen = regenStoryboardInput(next, "listicle-director");
  assert.equal(regen.startScene, undefined);
  assert.equal(regen.explainerScene, next.explainerScene);
});

test("a dual-beat clip keeps separate start and end stills", () => {
  const clip = row({
    startScene: "holds a ruler",
    endScene: "points at the chart",
    startVo: "First line.",
    endVo: "Second line.",
    englishVo: "First line. Second line.",
  });
  const next = clipWithSceneDraft(
    clip,
    { startScene: "crouches", endScene: "stands up", motionCamera: "jump" },
    CARTOON_EXPLAINER_SKILL_SLUG,
  );
  assert.equal(next.startScene, "crouches");
  assert.equal(next.endScene, "stands up");
  assert.equal(next.startVo, "First line.");
  assert.equal(next.endVo, "Second line.");
  assert.match(next.explainerScene, /crouches/);
  assert.match(next.explainerScene, /stands up/);
});

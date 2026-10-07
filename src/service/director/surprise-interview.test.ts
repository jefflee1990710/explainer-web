import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal, StoryboardRow } from "@/model/project";
import {
  shockPosterLines,
  surpriseVideoMotionRules,
  sanitizeSurprisePhaseA,
} from "@/service/director/surprise-interview";

function clip(clipNumber: number, partial: Partial<StoryboardRow> = {}): StoryboardRow {
  return {
    clipNumber,
    timeRange: "0-3s",
    durationSeconds: 3,
    narrativeJob: clipNumber === 1 ? "hook" : "interview",
    explainerScene: "talking",
    motionCamera: "0–3s camera locked.",
    englishVo: "I spent $0 on ads and got 37 clients.",
    startScene:
      "Character: Scro Official looks into the lens. Set: studio. Light: daylight. Camera: locked close-up.",
    endScene:
      "Character: Scro Official looks surprised. Set: studio. Light: daylight. Camera: locked close-up.",
    bgmSfx: "none",
    ...partial,
  };
}

function proposal(): PhaseAProposal {
  return {
    englishTitle: "t",
    localizedTitle: "t",
    targetDuration: "15s",
    clipCount: 2,
    loopMode: "linear",
    coreMessage: "c",
    hookStrategy: "h",
    aspectRatio: "9:16",
    visualWorld: "studio",
    narrator: "n",
    englishWordCount: 8,
    characterLock: "Scro Official",
    palette: "p",
    bgmDirection: "none",
    narrativeArc: "a",
    clips: [clip(1), clip(2, { motionCamera: "0–3s she nods, camera locked." })],
  };
}

test("clip 1 drops from above and zooms in, later clips stay seated", () => {
  const next = sanitizeSurprisePhaseA(proposal());
  const hook = next.clips[0];
  assert.match(hook.startScene || "", /looking down/);
  assert.match(hook.endScene || "", /dropped down and snapped a zoom-in/);
  assert.match(hook.motionCamera, /drops from above/);
  assert.match(hook.motionCamera, /not a flip/);
  assert.doesNotMatch(hook.startScene || "", /upside down/);
  assert.equal(hook.narrativeJob, "surprise");
  assert.match(next.clips[1].motionCamera, /camera locked/);
  assert.doesNotMatch(next.clips[1].startScene || "", /looking down/);
});

test("shock poster stacks a number payoff and a shouted last word", () => {
  const priced = shockPosterLines("I spent $0 on ads and got 37 clients.");
  assert.deepEqual(priced.body, ["I spent $0", "on ads and got"]);
  assert.equal(priced.payoff, "37 clients.");
  const shout = shockPosterLines("Why did no one tell me this before?!");
  assert.deepEqual(shout.body, ["Why did no one", "tell me this"]);
  assert.equal(shout.payoff, "before?!");
});

test("hook video rules demand a sharp drop and zoom, person upright", () => {
  const hook = surpriseVideoMotionRules(1);
  assert.match(hook, /right-side up/);
  assert.match(hook, /downward/);
  assert.match(hook, /zoom/i);
  assert.match(hook, /sharp and clear/);
  assert.doesNotMatch(hook, /head points to the bottom/);
  assert.doesNotMatch(hook, /same screen position and scale/);
  const later = surpriseVideoMotionRules(2);
  assert.match(later, /right-side up/);
  assert.match(later, /entire clip/);
  assert.match(later, /zoom out/);
});

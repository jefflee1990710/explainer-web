import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  OUTFIT_BASE_LOOK,
  rewriteOutfitSafetyText,
  sanitizeOutfitPhaseA,
} from "@/service/director/outfit-reel";

function proposal(startScene: string): PhaseAProposal {
  return {
    englishTitle: "t",
    localizedTitle: "t",
    targetDuration: "15s",
    clipCount: 1,
    loopMode: "linear",
    coreMessage: "c",
    hookStrategy: "h",
    aspectRatio: "9:16",
    visualWorld: "studio",
    narrator: "n",
    englishWordCount: 1,
    characterLock: "Scro Official：臉與髮型以藍圖為準",
    palette: "p",
    bgmDirection: "b",
    narrativeArc: "a",
    clips: [
      {
        clipNumber: 1,
        timeRange: "0-3s",
        durationSeconds: 3,
        narrativeJob: "skirt",
        explainerScene:
          "Start: Scro Official stands in white tight shorts only. End: the khaki mini skirt is on.",
        motionCamera: "0–3s pulls the mini skirt up over the pelvic area.",
        englishVo: "(no dialogue)",
        startScene,
        endScene:
          "Character: Scro Official wears the khaki mini skirt. Set: studio. Light: daylight. Camera: locked full-body.",
        bgmSfx: "s",
      },
    ],
  };
}

test("clip 1 start becomes a standing athletic base with hands at the sides", () => {
  const next = sanitizeOutfitPhaseA(
    proposal(
      "Character: Scro Official stands wearing white tight shorts only, holding a mini skirt at thigh height. Set: studio. Light: daylight. Camera: locked full-body.",
    ),
  );
  const clip = next.clips[0];
  assert.match(clip.startScene || "", /knee-length athletic shorts/);
  assert.match(clip.startScene || "", /hands relaxed at the sides/);
  assert.match(clip.startScene || "", /opaque white crew-neck tank/);
  assert.doesNotMatch(clip.startScene || "", /tight shorts/);
  assert.doesNotMatch(clip.startScene || "", /thigh height/);
  assert.doesNotMatch(clip.startScene || "", /holding/);
  assert.match(clip.endScene || "", /pleated skirt/);
  assert.doesNotMatch(clip.motionCamera, /pelvic area/);
  assert.doesNotMatch(clip.motionCamera, /pull/i);
  assert.match(clip.motionCamera, /stands still/);
  assert.match(clip.motionCamera, /waistband already at the natural waist/);
  assert.match(clip.explainerScene, new RegExp(OUTFIT_BASE_LOOK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("later dressing clips cut to a 3/4 angle instead of copying a facing-forward stance", () => {
  const phaseA = proposal(
    "Character: Scro Official stands centered facing forward, wearing an opaque white crew-neck tank. Set: studio. Light: daylight. Camera: locked full-body.",
  );
  phaseA.clipCount = 2;
  phaseA.clips.push({
    clipNumber: 2,
    timeRange: "3-6s",
    durationSeconds: 3,
    narrativeJob: "Emerald Green Cardigan (R1)",
    explainerScene: "Start: cardigan. End: cardigan on.",
    motionCamera: "0–3s she stands still facing camera and the cardigan appears.",
    englishVo: "(no dialogue)",
    startScene:
      "Character: Scro Official stands centered facing forward with a calm resting expression, wearing the tank and skirt, guiding the emerald green cardigan. Set: studio. Light: daylight. Camera: locked eye-level full-body shot, centered subject.",
    endScene:
      "Character: Scro Official stands centered facing forward, wearing the emerald green cardigan over the beige pleated skirt. Set: studio. Light: daylight. Camera: locked eye-level full-body shot, centered subject.",
    bgmSfx: "s",
  });
  const clip = sanitizeOutfitPhaseA(phaseA).clips[1];
  assert.match(clip.startScene || "", /3\/4/);
  assert.match(clip.endScene || "", /3\/4/);
  assert.doesNotMatch(clip.startScene || "", /guiding/);
  assert.doesNotMatch(clip.startScene || "", /facing forward/);
  assert.match(clip.motionCamera, /slides into the sleeves/);
  assert.match(clip.motionCamera, /never over the head/);
  assert.doesNotMatch(clip.motionCamera, /waistband already at the natural waist/);
  assert.match(clip.endScene || "", /Bare feet/);
  assert.doesNotMatch(clip.endScene || "", /wearing[^.]*sneaker/i);
});

test("rewriteOutfitSafetyText strips a thigh pull-up but keeps Never pull locks", () => {
  const next = rewriteOutfitSafetyText(
    "both hands pull the beige pleated skirt upward over her hips to her natural waistline. Never pull a skirt, shorts, trousers, or dress up from the thighs.",
  );
  assert.doesNotMatch(next, /pull the beige/i);
  assert.match(next, /smooth the beige pleated skirt at the natural waist/);
  assert.match(next, /Never pull a skirt/);
});

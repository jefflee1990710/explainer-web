import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  OUTFIT_CAMERA_MOVES,
  assignOutfitCameraMoves,
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
    bgmDirection: "upbeat music bed",
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
        englishVo: 'Scro Official: "Love this skirt."',
        startScene,
        endScene:
          "Character: Scro Official wears the khaki mini skirt. Set: studio. Light: daylight. Camera: locked full-body.",
        bgmSfx: "music",
        referenceImageIds: ["R1"],
      },
    ],
  };
}

const keepOrder = () => 0.999;

test("every clip is already dressed in the reference outfit, with no voice and no music", () => {
  const next = sanitizeOutfitPhaseA(
    proposal(
      "Character: Scro Official stands wearing white tight shorts only, holding a mini skirt at thigh height. Set: studio. Light: daylight. Camera: locked full-body.",
    ),
    keepOrder,
  );
  const clip = next.clips[0];
  assert.match(clip.startScene || "", /complete outfit from the clothing reference/);
  assert.match(clip.startScene || "", /copied exactly/);
  assert.match(clip.endScene || "", /complete outfit from the clothing reference/);
  assert.doesNotMatch(clip.startScene || "", /tight shorts/);
  assert.doesNotMatch(clip.startScene || "", /thigh height/);
  assert.doesNotMatch(clip.startScene || "", /holding/);
  assert.doesNotMatch(clip.startScene || "", /athletic shorts/);
  assert.doesNotMatch(clip.motionCamera, /pelvic area/);
  assert.doesNotMatch(clip.motionCamera, /pull/i);
  assert.match(clip.motionCamera, /sharp and quick/i);
  assert.match(clip.motionCamera, /already dressed/);
  assert.equal(clip.englishVo, "(no dialogue)");
  assert.match(clip.bgmSfx, /No background music/);
  assert.match(clip.bgmSfx, /No voice/);
  assert.match(next.bgmDirection, /No background music/);
  assert.equal(next.englishWordCount, 0);
  assert.equal(clip.narrativeJob, OUTFIT_CAMERA_MOVES[0].label);
  assert.match(clip.startScene || "", new RegExp(OUTFIT_CAMERA_MOVES[0].startCamera.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(clip.endScene || "", new RegExp(OUTFIT_CAMERA_MOVES[0].endCamera.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("later clips get different camera moves and keep every clothing reference", () => {
  const phaseA = proposal(
    "Character: Scro Official stands centered facing forward, wearing an opaque white crew-neck tank. Set: studio. Light: daylight. Camera: locked full-body.",
  );
  phaseA.clipCount = 3;
  phaseA.clips.push(
    {
      clipNumber: 2,
      timeRange: "3-6s",
      durationSeconds: 3,
      narrativeJob: "Emerald Green Cardigan (R1)",
      explainerScene: "Start: cardigan. End: cardigan on.",
      motionCamera: "0–3s she stands still facing camera and the cardigan appears.",
      englishVo: "(no dialogue)",
      startScene:
        "Character: Scro Official stands centered facing forward, guiding the emerald green cardigan. Set: studio. Light: daylight. Camera: locked eye-level full-body shot, centered subject.",
      endScene:
        "Character: Scro Official stands centered facing forward, wearing the cardigan. Set: studio. Light: daylight. Camera: locked eye-level full-body shot, centered subject.",
      bgmSfx: "s",
      referenceImageIds: ["R2"],
    },
    {
      clipNumber: 3,
      timeRange: "6-9s",
      durationSeconds: 3,
      narrativeJob: "hold",
      explainerScene: "hold",
      motionCamera: "0–3s she stands still.",
      englishVo: "Nice.",
      startScene:
        "Character: Scro Official stands centered facing forward, wearing the outfit. Set: studio. Light: daylight. Camera: locked full-body.",
      endScene:
        "Character: Scro Official stands centered facing forward. Set: studio. Light: daylight. Camera: locked full-body.",
      bgmSfx: "s",
    },
  );
  const clips = sanitizeOutfitPhaseA(phaseA, keepOrder).clips;
  assert.deepEqual(
    clips.map((clip) => clip.narrativeJob),
    OUTFIT_CAMERA_MOVES.slice(0, 3).map((move) => move.label),
  );
  assert.notEqual(clips[0].startScene?.match(/Camera: .+/)?.[0], clips[1].startScene?.match(/Camera: .+/)?.[0]);
  assert.notEqual(clips[1].endScene?.match(/Camera: .+/)?.[0], clips[2].endScene?.match(/Camera: .+/)?.[0]);
  for (const clip of clips) {
    assert.deepEqual(clip.referenceImageIds, ["R1", "R2"]);
    assert.equal(clip.englishVo, "(no dialogue)");
    assert.match(clip.startScene || "", /already|complete outfit/);
    assert.doesNotMatch(clip.motionCamera, /darts into the sleeves|waistband/);
  }
});

test("each plan can assign a different first camera move", () => {
  const first = assignOutfitCameraMoves(5, keepOrder).map((move) => move.id);
  const shuffled = assignOutfitCameraMoves(5, () => 0).map((move) => move.id);
  assert.equal(new Set(first).size, 5);
  assert.notEqual(first[0], shuffled[0]);
  for (let index = 1; index < shuffled.length; index += 1) {
    assert.notEqual(shuffled[index], shuffled[index - 1]);
  }
});

test("rewriteOutfitSafetyText strips a thigh pull-up but keeps Never pull locks", () => {
  const next = rewriteOutfitSafetyText(
    "both hands pull the beige pleated skirt upward over her hips to her natural waistline. Never pull a skirt, shorts, trousers, or dress up from the thighs.",
  );
  assert.doesNotMatch(next, /pull the beige/i);
  assert.match(next, /smooth the beige pleated skirt at the natural waist/);
  assert.match(next, /Never pull a skirt/);
});

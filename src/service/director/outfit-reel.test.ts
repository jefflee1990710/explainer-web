import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  OUTFIT_BASE_LOOK,
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
  assert.match(clip.motionCamera, /stands still/);
  assert.match(clip.explainerScene, new RegExp(OUTFIT_BASE_LOOK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

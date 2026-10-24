import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  OUTFIT_CHANGE_CAMERA,
  assignOutfitChangeLooks,
  sanitizeOutfitChangeFrameScene,
  sanitizeOutfitChangePhaseA,
} from "@/service/director/outfit-change";

function proposal(startScene: string): PhaseAProposal {
  return {
    englishTitle: "t",
    localizedTitle: "t",
    targetDuration: "15s",
    clipCount: 1,
    loopMode: "linear",
    coreMessage: "Buttoned or unbuttoned?",
    hookStrategy: "h",
    aspectRatio: "9:16",
    visualWorld: "white room",
    narrator: "n",
    englishWordCount: 1,
    characterLock: "Lynn：臉與髮型以藍圖為準",
    palette: "p",
    bgmDirection: "upbeat music bed",
    narrativeArc: "a",
    clips: [
      {
        clipNumber: 1,
        timeRange: "0-5s",
        durationSeconds: 5,
        narrativeJob: "skirt",
        explainerScene: "Start: Lynn stands in white tight shorts only. End: the khaki mini skirt is on.",
        motionCamera: "0–5s the camera rotates left to right.",
        englishVo: 'Lynn: "Love this look."',
        startScene,
        endScene:
          "Character: Lynn wears the khaki mini skirt. Set: studio. Light: daylight. Camera: locked full-body.",
        bgmSfx: "music",
        referenceImageIds: ["R1"],
      },
    ],
  };
}

test("every clip is already dressed, silent, and holds a locked camera in one empty white room", () => {
  const next = sanitizeOutfitChangePhaseA(
    proposal(
      "Character: Lynn stands wearing white tight shorts only, holding a mini skirt at thigh height. Set: studio. Light: daylight. Camera: locked full-body.",
    ),
  );
  const clip = next.clips[0];
  assert.match(clip.startScene || "", /calm and editorial/);
  assert.match(clip.startScene || "", /complete look assigned to THIS clip/);
  assert.match(clip.startScene || "", /empty cream-white room/);
  assert.match(clip.startScene || "", /plain wall/);
  assert.doesNotMatch(clip.startScene || "", /tight shorts/);
  assert.doesNotMatch(clip.startScene || "", /holding/);
  assert.doesNotMatch(clip.motionCamera, /gimbal|rotation|left to right/i);
  assert.match(clip.motionCamera, /locked camera/);
  assert.match(clip.motionCamera, /already this clip's complete look/);
  assert.match(clip.startScene || "", new RegExp(OUTFIT_CHANGE_CAMERA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(clip.endScene || "", new RegExp(OUTFIT_CHANGE_CAMERA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(clip.startScene?.match(/Camera: .+/)?.[0], clip.endScene?.match(/Camera: .+/)?.[0]);
  assert.equal(clip.englishVo, "(no dialogue)");
  assert.match(clip.bgmSfx, /No background music/);
  assert.match(clip.bgmSfx, /No voice/);
  assert.match(next.bgmDirection, /No background music/);
  assert.equal(next.englishWordCount, 0);
  assert.match(clip.narrativeJob, /Look 1/);
});

test("later clips keep the same locked camera and assign one look each", () => {
  const phaseA = proposal(
    "Character: Lynn stands centered facing forward. Set: studio. Light: daylight. Camera: locked full-body.",
  );
  phaseA.clipCount = 3;
  phaseA.coreMessage = "fall capsule wardrobe";
  phaseA.clips.push(
    {
      clipNumber: 2,
      timeRange: "5-10s",
      durationSeconds: 5,
      narrativeJob: "cardigan",
      explainerScene: "cardigan on",
      motionCamera: "0–5s the camera orbits.",
      englishVo: "Nice.",
      startScene:
        "Character: Lynn stands centered, guiding the emerald green cardigan. Set: studio. Light: daylight. Camera: overhead.",
      endScene:
        "Character: Lynn wears the cardigan. Set: studio. Light: daylight. Camera: overhead.",
      bgmSfx: "s",
      referenceImageIds: ["R2"],
    },
    {
      clipNumber: 3,
      timeRange: "10-15s",
      durationSeconds: 5,
      narrativeJob: "coat",
      explainerScene: "coat",
      motionCamera: "0–5s she walks forward.",
      englishVo: "(no dialogue)",
      startScene:
        "Character: Lynn stands wearing the coat. Set: street. Light: daylight. Camera: wide.",
      endScene:
        "Character: Lynn stands wearing the coat. Set: street. Light: daylight. Camera: wide.",
      bgmSfx: "s",
      referenceImageIds: ["R3"],
    },
  );
  const clips = sanitizeOutfitChangePhaseA(phaseA).clips;
  assert.deepEqual(
    clips.map((clip) => clip.narrativeJob),
    ["Look 1", "Look 2", "Look 3"],
  );
  assert.deepEqual(clips[0].referenceImageIds, ["R1"]);
  assert.deepEqual(clips[1].referenceImageIds, ["R2"]);
  assert.deepEqual(clips[2].referenceImageIds, ["R3"]);
  const cameras = clips.map((clip) => clip.startScene?.match(/Camera: .+/)?.[0]);
  assert.equal(cameras[0], cameras[1]);
  assert.equal(cameras[1], cameras[2]);
  for (const clip of clips) {
    assert.equal(clip.englishVo, "(no dialogue)");
    assert.match(clip.startScene || "", /empty cream-white room/);
    assert.doesNotMatch(clip.motionCamera, /orbit|walks forward|gimbal/i);
    assert.match(clip.motionCamera, /Hard cut|locked camera|already this clip/i);
  }
});

test("buttoned or unbuttoned briefs alternate styling variants of the same piece", () => {
  const looks = assignOutfitChangeLooks(4, ["R1"], "Buttoned or unbuttoned? Which way would you wear it?");
  assert.deepEqual(
    looks.map((look) => look.label),
    ["Look 1 (buttoned)", "Look 2 (unbuttoned)", "Look 3 (buttoned)", "Look 4 (unbuttoned)"],
  );
  assert.deepEqual(looks.map((look) => look.referenceImageIds), [["R1"], ["R1"], ["R1"], ["R1"]]);
});

test("many clothing photos stay one look per clip without inventing button variants", () => {
  const looks = assignOutfitChangeLooks(3, ["R1", "R2", "R3"], "fall capsule wardrobe");
  assert.deepEqual(
    looks.map((look) => look.label),
    ["Look 1", "Look 2", "Look 3"],
  );
  assert.equal(looks[0].variant, undefined);
});

test("sanitizeOutfitChangeFrameScene relocks the empty room and planted pose", () => {
  const scene = sanitizeOutfitChangeFrameScene({
    scene:
      "Character: Lynn stands wearing athletic shorts, holding a cardigan. Set: concrete studio. Light: window. Camera: overhead full-body.",
    clipNumber: 2,
    position: "start",
    name: "Lynn",
  });
  assert.match(scene, /calm and editorial/);
  assert.match(scene, /empty cream-white room/);
  assert.match(scene, new RegExp(OUTFIT_CHANGE_CAMERA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(scene, /athletic shorts|holding a|overhead full-body/i);
});

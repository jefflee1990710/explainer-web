import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/types/project";
import { buildFramePrompt } from "./frame-prompts";

function project(styleId?: Project["styleId"]): Project {
  return {
    _id: new ObjectId(),
    projectId: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "u",
    skillId: new ObjectId(),
    skillSlug: "s",
    source: "src",
    aspectRatio: "16:9",
    durationPreset: "punchy",
    styleId,
    status: "frames_ready",
    clips: [],
    creditCost: 0,
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    phaseA: {
      englishTitle: "t",
      localizedTitle: "t",
      targetDuration: "15s",
      clipCount: 1,
      loopMode: "linear",
      coreMessage: "c",
      hookStrategy: "h",
      aspectRatio: "16:9",
      visualWorld: "vw",
      narrator: "n",
      englishWordCount: 5,
      characterLock: "lock",
      palette: "pal",
      bgmDirection: "b",
      narrativeArc: "a",
      clips: [{
        clipNumber: 1,
        timeRange: "0-5s",
        durationSeconds: 5,
        narrativeJob: "j",
        explainerScene: "scene",
        motionCamera: "cam",
        englishVo: "vo",
        referenceTranslation: "r",
        bgmSfx: "s",
      }],
    },
  };
}

test("doodle frame prompt uses catalog text, no hard-coded whiteboard literal", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /Whiteboard doodle explainer video/);
  assert.match(prompt, /Canvas: clean solid white canvas/);
  assert.match(prompt, /Lettering: short handwritten all-caps marker labels/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video gets pixel canvas and lettering", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /Pixel art explainer video/);
  assert.match(prompt, /Lettering: blocky monospaced pixel font/);
});

test("sibling reference line appears only when a styleRefUrl is given", () => {
  const without = buildFramePrompt(project(), 1, "start");
  const withRef = buildFramePrompt(project(), 1, "start", {
    styleRefUrl: "https://x/y.png",
  });
  assert.doesNotMatch(without, /sibling frame/);
  assert.match(withRef, /the completed sibling frame from the other end of this clip/);
});

test("REVISION line precedes the sibling line so 'FIRST attached' stays true", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
    styleRefUrl: "https://x/sibling.png",
  });
  const revisionAt = prompt.indexOf("REVISION: the FIRST attached reference image");
  const siblingAt = prompt.indexOf("the completed sibling frame from the other end of this clip");
  assert.ok(revisionAt >= 0, "revision line missing");
  assert.ok(siblingAt >= 0, "sibling line missing");
  assert.ok(revisionAt < siblingAt, "sibling line must come after the REVISION line");
  assert.match(prompt, /after any annotated previous version/);
});

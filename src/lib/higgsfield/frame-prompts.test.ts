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

test("end frame is the same shot as start, not a new composition", () => {
  const prompt = buildFramePrompt(project(), 1, "end");
  assert.match(prompt, /SAME SHOT/);
  assert.match(prompt, /modest continuation/);
  assert.doesNotMatch(prompt, /resting state after all described motion has completed/);
});

test("start frame stays an opening state of this shot", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /FIRST frame/);
  assert.match(prompt, /opening state/);
});

test("clip-start anchor tells the model to keep camera and character placement", () => {
  const prompt = buildFramePrompt(project(), 1, "end", {
    styleRefUrl: "https://x/start.png",
    anchorKind: "clip-start",
  });
  assert.match(prompt, /THIS CLIP'S START frame/);
  assert.match(prompt, /same camera/);
  assert.match(prompt, /Do not teleport/);
});

test("sibling reference line appears only when a styleRefUrl is given", () => {
  const without = buildFramePrompt(project(), 1, "start");
  const withRef = buildFramePrompt(project(), 1, "start", {
    styleRefUrl: "https://x/y.png",
    anchorKind: "clip-end",
  });
  assert.doesNotMatch(without, /sibling frame/);
  assert.match(withRef, /the completed sibling frame from the other end of this clip/);
});

test("with a cast, the reference-sheet rule precedes the text characterLock", () => {
  const withCast = project();
  withCast.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Math Tutor",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  const prompt = buildFramePrompt(withCast, 1, "start");
  const sheetAt = prompt.indexOf("Attached image 1 is the selected character reference");
  const lockAt = prompt.indexOf("Locked character");
  assert.ok(sheetAt >= 0, "cast sheet line missing");
  assert.ok(lockAt >= 0, "characterLock line missing");
  assert.ok(sheetAt < lockAt, "reference-sheet rule must come before the text lock");
  // The text lock is demoted to a hint when a cast exists.
  assert.match(
    prompt,
    /Locked character \(names and staging hint; appearance comes from the attached reference\): lock/,
  );
  assert.match(prompt, /Plan this scene around these exact characters/);
});

test("character sheet is numbered after the annotated redo and sibling still", () => {
  const withCast = project();
  withCast.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Math Tutor",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  const prompt = buildFramePrompt(withCast, 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
    styleRefUrl: "https://x/sibling.png",
  });
  assert.match(prompt, /Attached image 3 is the selected character reference/);
});

test("a solo still is attached as the character the scene must follow", () => {
  const solo = project();
  solo.characterStillUrl = "https://blob/still.png";
  const prompt = buildFramePrompt(solo, 1, "start");
  assert.match(prompt, /Attached image 1 is the selected character reference/);
  assert.match(prompt, /Plan this scene around that exact character/);
});

test("without a cast, the text characterLock stays authoritative", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /Locked character \(must look identical in every frame\): lock/);
  assert.doesNotMatch(prompt, /Cast reference sheets are attached/);
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

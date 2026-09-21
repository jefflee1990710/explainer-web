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
  assert.match(prompt, /Whiteboard doodle short video/);
  assert.match(prompt, /Canvas: clean solid white canvas/);
  assert.match(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /Lettering:/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video gets pixel canvas and no lettering unless scene text is on", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /Pixel art short video/);
  assert.doesNotMatch(prompt, /Lettering:/);
});

test("end frame is the same shot as start, not a new composition", () => {
  const prompt = buildFramePrompt(project(), 1, "end");
  assert.match(prompt, /SAME locked camera/);
  assert.match(prompt, /5–6s/);
  assert.doesNotMatch(prompt, /modest continuation/);
});

test("start frame stays an opening state of this shot", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /FIRST frame/);
  assert.match(prompt, /Opening at t=0s/);
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

test("with a cast, the blueprint rule precedes names-only lock and skips invented looks", () => {
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
  withCast.phaseA!.characterLock = "Math Tutor 穿鼠尾草綠無袖連身裙";
  const prompt = buildFramePrompt(withCast, 1, "start");
  const sheetAt = prompt.indexOf("Attached image 1 is the selected character blueprint");
  const lockAt = prompt.indexOf("Locked cast");
  assert.ok(sheetAt >= 0, "cast sheet line missing");
  assert.ok(lockAt >= 0, "cast lock line missing");
  assert.ok(sheetAt < lockAt, "blueprint rule must come before the lock line");
  assert.match(
    prompt,
    /Locked cast \(names only; appearance follows the attached blueprint only\): Math Tutor\./,
  );
  assert.doesNotMatch(prompt, /鼠尾草綠無袖連身裙/);
  assert.match(prompt, /Ignore any clothing, hair, or style wording/);
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
  assert.match(prompt, /Attached image 3 is the selected character blueprint/);
});

test("end-frame anchor keeps camera from start but outfit from blueprint", () => {
  const withCast = project();
  withCast.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  const prompt = buildFramePrompt(withCast, 1, "end", {
    styleRefUrl: "https://x/start.png",
    anchorKind: "clip-start",
  });
  assert.match(prompt, /THIS CLIP'S START frame/);
  assert.match(prompt, /MUST match the attached character blueprint exactly/);
  assert.match(prompt, /Do not copy drifted clothing from the start frame/);
});

test("a solo still is attached as the character the scene must follow", () => {
  const solo = project();
  solo.characterStillUrl = "https://blob/still.png";
  solo.phaseA!.characterLock = "發明的綠洋裝";
  const prompt = buildFramePrompt(solo, 1, "start");
  assert.match(prompt, /Attached image 1 is the selected character guideline/);
  assert.match(prompt, /attached character guideline only/);
  assert.doesNotMatch(prompt, /發明的綠洋裝/);
});

test("disabled scene text drops lettering and forbids on-canvas words", () => {
  const off = project();
  off.sceneTextEnabled = false;
  const prompt = buildFramePrompt(off, 1, "start");
  assert.match(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /Lettering:/);
});

test("enabled scene text puts the voiceover line on canvas with lettering", () => {
  const on = project();
  on.sceneTextEnabled = true;
  on.sceneTextLanguage = "zh-Hant";
  const prompt = buildFramePrompt(on, 1, "start");
  assert.match(prompt, /Lettering:/);
  assert.match(prompt, /subtitles ON/i);
  assert.match(prompt, /Subtitle \(spell exactly\): "vo"/);
  const sceneAt = prompt.indexOf("Scene:");
  const subAt = prompt.indexOf("On-canvas subtitles ON");
  assert.ok(subAt >= 0 && subAt < sceneAt, "subtitle block must precede Scene");
  assert.doesNotMatch(prompt, /Mental Health\?/);
  assert.doesNotMatch(prompt, /never subtitles or captions/i);
});

test("disabled scene text ignores words mentioned in the scene description", () => {
  const off = project();
  off.sceneTextEnabled = false;
  off.phaseA!.clips[0].explainerScene = "A sign reads HELLO";
  const prompt = buildFramePrompt(off, 1, "end");
  assert.match(prompt, /Ignore any mention of words/);
  assert.doesNotMatch(prompt, /On-canvas text/);
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

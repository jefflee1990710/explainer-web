import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";

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
  assert.match(prompt, /Lettering:/);
  assert.doesNotMatch(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video gets pixel canvas and its own pixel lettering", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /Pixel art short video/);
  assert.match(prompt, /Lettering: blocky monospaced pixel font/);
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

test("frame prompts never mention an attached previous still", () => {
  const prompt = buildFramePrompt(project(), 1, "end");
  assert.doesNotMatch(prompt, /THIS CLIP'S START frame/);
  assert.doesNotMatch(prompt, /previous clip's END frame/);
  assert.doesNotMatch(prompt, /sibling frame/);
  assert.doesNotMatch(prompt, /previous still/);
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

test("opening still without a previous frame still numbers the blueprint first", () => {
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
  });
  assert.match(prompt, /Attached image 2 is the selected character blueprint/);
});

test("end-frame prompt still locks look to the attached blueprint", () => {
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
  const prompt = buildFramePrompt(withCast, 1, "end");
  assert.match(prompt, /Attached image 1 is the selected character blueprint/);
  assert.match(prompt, /BLUEPRINT \/ reference sheet only/);
  assert.match(prompt, /exactly ONE instance of each named/);
  assert.match(
    prompt,
    /Locked cast \(names only; appearance follows the attached blueprint only\): Lily\./,
  );
  assert.doesNotMatch(prompt, /previous still/);
  assert.doesNotMatch(prompt, /THIS CLIP'S START frame/);
});

test("opening still still forbids copying a multi-pose blueprint into the scene", () => {
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
  const prompt = buildFramePrompt(withCast, 1, "start");
  assert.match(prompt, /BLUEPRINT \/ reference sheet only/);
  assert.match(prompt, /exactly ONE instance of each named/);
  assert.match(prompt, /Never copy the sheet layout/);
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

test("legacy disabled scene text still paints the voiceover lettering", () => {
  const off = project();
  off.sceneTextEnabled = false;
  const prompt = buildFramePrompt(off, 1, "start");
  assert.match(prompt, /Lettering:/);
  assert.match(prompt, /Subtitle \(spell exactly\): "vo"/);
  assert.doesNotMatch(prompt, /No on-canvas text/);
});

test("whiteboard explainer dual-beat uses start/end scene and VO per still", () => {
  const dual = project();
  dual.skillSlug = "cartoon-explainer-video-director";
  dual.sceneTextEnabled = true;
  dual.phaseA!.clips[0] = {
    ...dual.phaseA!.clips[0],
    startScene: "起點拿尺",
    endScene: "尺變成回歸線",
    startVo: "First beat.",
    endVo: "Second beat.",
    explainerScene: "起始：起點拿尺。結尾：尺變成回歸線。",
    englishVo: "First beat. Second beat.",
  };
  const start = buildFramePrompt(dual, 1, "start");
  const end = buildFramePrompt(dual, 1, "end");
  assert.match(start, /Scene: 起點拿尺/);
  assert.doesNotMatch(start, /尺變成回歸線/);
  assert.match(start, /52% and 60%/);
  assert.match(start, /Marker line \(spell exactly, black marker\): "FIRST BEAT\."/);
  assert.doesNotMatch(start, /bottom 18%/);
  assert.doesNotMatch(start, /SECOND BEAT/);
  assert.match(end, /Scene: 尺變成回歸線/);
  assert.match(end, /SECOND BEAT/);
  assert.doesNotMatch(end, /FIRST BEAT/);
});

test("legacy captions-off whiteboard video keeps prop labels, paints the marker beat, and strips text policy from visualWorld", () => {
  const dual = project();
  dual.skillSlug = "cartoon-explainer-video-director";
  dual.sceneTextEnabled = false;
  dual.phaseA!.visualWorld =
    "白板塗鴉風格。純白背景黑色墨線。無任何畫布文字、無任何標籤符號或字幕，純靠圖案傳達。";
  dual.phaseA!.clips[0] = {
    ...dual.phaseA!.clips[0],
    startScene: "John 舉著巨大黃色木尺，尺上掛著黃色標籤「OLS」，旁邊飄著灰色散點。",
    endScene: "木尺變成回歸線，上方黃色 tag 寫著「β」。",
    startVo: "First beat.",
    endVo: "Second beat.",
    explainerScene: "起始：…。結尾：…",
    englishVo: "First beat. Second beat.",
  };
  const start = buildFramePrompt(dual, 1, "start");
  assert.match(start, /「OLS」/);
  assert.match(start, /FIRST BEAT/);
  assert.match(start, /52% and 60%/);
  assert.doesNotMatch(start, /No on-canvas text/);
  assert.match(start, /Visual world: 白板塗鴉風格。純白背景黑色墨線。/);
  assert.doesNotMatch(start, /無任何畫布文字/);
});

test("legacy captions-off story short now paints the dialogue line and strips invented labels", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = false;
  story.phaseA!.clips[0].explainerScene = "牆上掛著寫有「HELLO」的牌子";
  const prompt = buildFramePrompt(story, 1, "start");
  assert.doesNotMatch(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /HELLO/);
  assert.match(prompt, /Subtitle \(spell exactly\): "vo"/);
});

test("other skills keep a single scene and full voiceover on both stills", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].explainerScene = "整段同一個畫面描述";
  story.phaseA!.clips[0].englishVo = "Whole line.";
  const start = buildFramePrompt(story, 1, "start");
  const end = buildFramePrompt(story, 1, "end");
  assert.match(start, /Scene: 整段同一個畫面描述/);
  assert.match(end, /Scene: 整段同一個畫面描述/);
  assert.match(start, /Whole line/);
  assert.match(end, /Whole line/);
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

test("legacy disabled scene text limits writing to the subtitle", () => {
  const off = project();
  off.sceneTextEnabled = false;
  off.phaseA!.clips[0].explainerScene = "A sign reads HELLO";
  const prompt = buildFramePrompt(off, 1, "end");
  assert.match(prompt, /Only the subtitle line\(s\) above may appear as writing/);
  assert.match(prompt, /subtitles ON/i);
});

test("without a cast, the text characterLock stays authoritative", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /Locked character \(must look identical in every frame\): lock/);
  assert.doesNotMatch(prompt, /Cast reference sheets are attached/);
});

test("listicle stills paint a numbered item list even when scene text is off", () => {
  const list = project();
  list.skillSlug = "listicle-director";
  list.sceneTextEnabled = false;
  list.phaseA!.clips = [
    {
      ...list.phaseA!.clips[0],
      clipNumber: 1,
      narrativeJob: "hook",
      englishVo: "Two money leaks.",
    },
    {
      ...list.phaseA!.clips[0],
      clipNumber: 2,
      narrativeJob: "item 1 of 2",
      englishVo: "Unused subscriptions.",
    },
  ];
  const prompt = buildFramePrompt(list, 2, "start");
  assert.match(prompt, /numbered list/i);
  assert.match(prompt, /Unused subscriptions/);
  assert.doesNotMatch(prompt, /No on-canvas text/);
});

test("REVISION line does not attach a sibling or previous still", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
  });
  assert.match(prompt, /REVISION: the FIRST attached reference image/);
  assert.doesNotMatch(prompt, /sibling frame/);
  assert.doesNotMatch(prompt, /previous still/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import {
  FRAME_PROMPT_BUDGET,
  IMAGE_PROMPT_MAX_CHARS,
  buildFramePrompt,
  frameSubmitPlan,
  framesWithClips,
} from "@/service/higgsfield/frame-prompts";

test("bookend stills attach the logo after the character refs and name it", () => {
  const logo = "https://blob/logo.png";
  const opening = { ...project(), skillSlug: "opening-director", logoUrl: logo };
  const plan = frameSubmitPlan(opening, 1, "start");
  assert.deepEqual(plan.refs, [logo]);
  assert.match(plan.prompt, /BRAND LOGO: attached image 1 is the brand logo/);
});

test("non-bookend videos ignore a stray logo", () => {
  const other = { ...project(), logoUrl: "https://blob/logo.png" };
  const plan = frameSubmitPlan(other, 1, "start");
  assert.deepEqual(plan.refs, []);
  assert.doesNotMatch(plan.prompt, /BRAND LOGO/);
});

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

test("next start uses the previous end as a place reference, not the same camera", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    anchor: { kind: "prev-end" },
  });
  assert.match(prompt, /ENVIRONMENT REFERENCE/);
  assert.match(prompt, /previous clip's END frame/);
  assert.match(prompt, /MAY change/);
  assert.doesNotMatch(prompt, /COMPOSITION LOCK/);
  assert.doesNotMatch(prompt, /Do not invent a new room or camera/);
});

test("end frame with a start still names it as the composition lock", () => {
  const prompt = buildFramePrompt(project(), 1, "end", {
    anchor: { kind: "clip-start" },
  });
  assert.match(prompt, /COMPOSITION LOCK/);
  assert.match(prompt, /attached image 1 is THIS CLIP'S START frame/);
  assert.match(prompt, /Do not invent a new room or camera/);
});

test("whiteboard explainer stills keep the character silent and using the props", () => {
  const cartoon = project();
  cartoon.skillSlug = "cartoon-explainer-video-director";
  assert.match(buildFramePrompt(cartoon, 1, "start"), /Silent demonstrator/);
  assert.match(buildFramePrompt(cartoon, 1, "end"), /every prop named in the Scene/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /Silent demonstrator/);
});

test("story-short 9:16 stills place subtitles in the reel safe zone", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.aspectRatio = "9:16";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Lily: "We made it."';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /64% and 78%/);
  assert.match(prompt, /We made it\./);
  assert.doesNotMatch(prompt, /bottom 18%/);
  assert.match(prompt, /reel safe zone/);

  story.aspectRatio = "16:9";
  const wide = buildFramePrompt(story, 1, "start");
  assert.match(wide, /bottom 18%/);
  assert.doesNotMatch(wide, /64% and 78%/);

  const other = project();
  other.aspectRatio = "9:16";
  other.sceneTextEnabled = true;
  assert.match(buildFramePrompt(other, 1, "start"), /bottom 18%/);
});

test("story-short subtitles show only the spoken words, never the speaker name", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Scro - Cinematic: "One clone, unlimited environments."';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /One clone,/);
  assert.doesNotMatch(prompt, /Subtitle[^\n]*Scro - Cinematic/);
});

test("cast stills lock the blueprint outfit against the setting", () => {
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
  withCast.phaseA!.clips[0].explainerScene = "Lily on a blizzard-swept mountain ridge";
  const prompt = buildFramePrompt(withCast, 1, "start");
  assert.match(prompt, /WARDROBE LOCK/);
  assert.match(prompt, /whatever the weather/);
  assert.match(prompt, /Never add or swap coats, jackets/);
  assert.ok(
    prompt.indexOf("WARDROBE LOCK") > prompt.indexOf("Scene:"),
    "wardrobe lock must follow the scene text",
  );
  assert.match(prompt, /Final check: each character wears exactly the blueprint outfit/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /WARDROBE LOCK/);
});

test("end frame with a start still numbers the blueprint after that still", () => {
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
    anchor: { kind: "clip-start" },
  });
  assert.match(prompt, /Attached image 2 is the selected character blueprint/);
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
  assert.match(prompt, /Attached image 1 is the selected character blueprint/);
  assert.match(prompt, /Cast: Math Tutor\./);
  // Names already sit in the blueprint line; no separate lock line.
  assert.doesNotMatch(prompt, /Locked cast/);
  assert.doesNotMatch(prompt, /鼠尾草綠無袖連身裙/);
  assert.match(prompt, /Ignore any clothing, hair, or style wording/);
});

test("frameSubmitPlan attaches this clip's start still when generating the end", () => {
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
  withCast.frames = [
    {
      clipNumber: 1,
      position: "start",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/start.png",
    },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  const plan = frameSubmitPlan(withCast, 1, "end");
  assert.deepEqual(plan.refs, ["https://blob/start.png", "https://blob/c.png"]);
  assert.equal(plan.anchor?.kind, "clip-start");
  assert.match(plan.prompt, /THIS CLIP'S START frame/);
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
  assert.match(prompt, /Cast: Lily\./);
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

test("every still carries the render detail line", () => {
  assert.match(buildFramePrompt(project(), 1, "start"), /Render detail:/);
  assert.match(buildFramePrompt(project(), 1, "end"), /Render detail:/);
});

test("story-short stills are third-person: no one looks into the camera", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  assert.match(buildFramePrompt(story, 1, "start"), /third-person observer camera/);
  assert.match(buildFramePrompt(story, 1, "end"), /No eye contact with the lens/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /third-person observer camera/);
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

test("framesWithClips queues start and end for every clip", () => {
  const next = framesWithClips(project(), [1]);
  assert.deepEqual(
    next.map((frame) => `${frame.clipNumber}:${frame.position}:${frame.status}`),
    ["1:start:queued", "1:end:queued"],
  );
});

test("end frame handoff stays short and does not paste the next clip scene", () => {
  const dual = project();
  dual.skillSlug = "cartoon-explainer-video-director";
  dual.phaseA!.clips = [
    {
      ...dual.phaseA!.clips[0],
      clipNumber: 1,
      durationSeconds: 6,
      startScene: "起點拿尺",
      endScene: "尺變成回歸線",
      startVo: "First beat.",
      endVo: "Second beat.",
    },
    {
      ...dual.phaseA!.clips[0],
      clipNumber: 2,
      durationSeconds: 5,
      startScene:
        'Locked camera, 9:16 vertical composition on clean white canvas. Exactly one instance of Scro holds a box labeled 「SCRO RESULTS」. On-canvas handwritten marker text centered at 56% frame height displays: "FOLLOW US RIGHT NOW"',
      endScene: "收尾",
      startVo: "Follow us right now",
      endVo: "Thanks.",
    },
  ];
  const end = buildFramePrompt(dual, 1, "end");
  assert.match(end, /hand off to the next clip on the same locked camera/);
  assert.doesNotMatch(end, /SCRO RESULTS/);
  assert.doesNotMatch(end, /FOLLOW US RIGHT NOW/);
});

test("dual-beat stills with a cast stay under the Flare prompt cap", () => {
  const dual = project();
  dual.skillSlug = "cartoon-explainer-video-director";
  dual.aspectRatio = "9:16";
  dual.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Scro",
      blueprintUrl: "https://blob/scro.png",
      prompt: "",
    },
  ];
  dual.phaseA!.visualWorld =
    "Canvas: clean solid white canvas, as if sketched with a digital marker. Look: 2D hand-drawn cartoon with bold black outlines. Typography: handwritten all-caps marker lettering. Motion: marker-doodle snappy pop.";
  dual.phaseA!.palette =
    "White canvas, black ink outlines, warm yellow for tags and highlight containers, green for arrows and confirmation marks, brown for cardboard packages, and gray for UI frames and neutral props.";
  dual.phaseA!.clips = [1, 2, 3].map((n) => ({
    ...dual.phaseA!.clips[0],
    clipNumber: n,
    durationSeconds: n === 2 ? 6 : 5,
    startScene:
      "Same locked camera on solid white canvas. Exactly one instance of Scro stands in a proud resting pose at center, surrounded by three warm-yellow doodle cards with green arrows. On-canvas handwritten marker text centered at 56% frame height displays: \"TO INTRODUCE PRODUCTS, EXPLAIN CONCEPTS,\" with second line \"AND DELIVER ANY MESSAGE.\" in a warm-yellow highlight box.",
    endScene:
      "Same locked camera on solid white canvas. Exactly one instance of Scro stands in a proud resting pose at center, surrounded by three warm-yellow doodle cards with green arrows and small icons for a box, a lightbulb, and a message bubble. On-canvas handwritten marker text centered at 56% frame height displays: \"TO INTRODUCE PRODUCTS, EXPLAIN CONCEPTS,\" with second line \"AND DELIVER ANY MESSAGE.\" in a warm-yellow highlight box.",
    startVo: "To introduce products, explain concepts,",
    endVo: "and deliver any message.",
    motionCamera:
      "固定鏡頭（Locked camera）。中央的數位平板邊框在 0 至 3 秒間向右位移並平滑形變成三枚展開的手繪卡片；Scro 從左側微步移動至中央，雙臂流暢平舉引導視線望向環繞的卡片。",
    explainerScene: "起始：…。結尾：…",
    englishVo: "To introduce products, explain concepts, and deliver any message.",
  }));
  dual.frames = [1, 2, 3].flatMap((clipNumber) => [
    {
      clipNumber,
      position: "start" as const,
      prompt: "p",
      status: "completed" as const,
      blobUrl: `https://blob/c${clipNumber}-start.png`,
    },
    { clipNumber, position: "end" as const, prompt: "p", status: "queued" as const },
  ]);
  for (const clipNumber of [1, 2, 3]) {
    for (const position of ["start", "end"] as const) {
      const prompt = frameSubmitPlan(dual, clipNumber, position).prompt;
      assert.ok(
        prompt.length <= IMAGE_PROMPT_MAX_CHARS,
        `clip ${clipNumber} ${position} is ${prompt.length} chars`,
      );
    }
  }
});

test("stills carry only their own motion beat, not the whole timeline", () => {
  const p = project();
  p.phaseA!.clips[0].motionCamera = "0–2s: Lily lifts the cup; 2–5s: she sets it down and smiles";
  const start = buildFramePrompt(p, 1, "start");
  const end = buildFramePrompt(p, 1, "end");
  assert.match(start, /Lily lifts the cup/);
  assert.doesNotMatch(start, /sets it down/);
  assert.match(end, /sets it down and smiles/);
  assert.doesNotMatch(end, /lifts the cup/);
  assert.doesNotMatch(start, /Motion and camera across the clip/);
});

test("a cast still spends far fewer characters on the character rules", () => {
  const withCast = project();
  withCast.cast = [
    { characterId: new ObjectId(), versionId: new ObjectId(), name: "Lily", blueprintUrl: "https://blob/c.png", prompt: "" },
  ];
  const bare = buildFramePrompt(project(), 1, "start").length;
  const cast = buildFramePrompt(withCast, 1, "start").length;
  assert.ok(cast - bare <= 900, `cast rules add ${cast - bare} chars`);
});

test("an oversized storyboard is trimmed under budget, keeping locks and subtitles", () => {
  const huge = project();
  huge.skillSlug = "story-short-director";
  huge.sceneTextEnabled = true;
  huge.cast = [
    { characterId: new ObjectId(), versionId: new ObjectId(), name: "Lily", blueprintUrl: "https://blob/c.png", prompt: "" },
  ];
  huge.phaseA!.visualWorld = "寒冷的山頂。".repeat(200);
  huge.phaseA!.palette = "冰川藍、暗岩灰、".repeat(100);
  const hugeScene =
    "1) Character: Lily 神情專注，右手握著裝置。2) Set: " + "厚雪與岩石，".repeat(150) +
    "3) Light: " + "冷光，".repeat(150) + "4) Camera: 中景，角色在畫面右側。";
  huge.phaseA!.clips[0].startScene = hugeScene;
  huge.phaseA!.clips[0].endScene = hugeScene;
  huge.phaseA!.clips[0].motionCamera = "0–3s: " + "走上岩石，".repeat(200) + "; 3–5s: 停下。";
  huge.phaseA!.clips[0].englishVo = 'Lily: "We made it to the top."';
  huge.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/s.png" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  for (const position of ["start", "end"] as const) {
    const prompt = frameSubmitPlan(huge, 1, position, {
      remark: "請把她的手放低一點。".repeat(80),
      annotatedUrl: "https://x/a.png",
    }).prompt;
    assert.ok(prompt.length <= FRAME_PROMPT_BUDGET, `${position} is ${prompt.length} chars`);
    assert.match(prompt, /We made it to the top\./);
    assert.match(prompt, /WARDROBE LOCK/);
    assert.match(prompt, /1\) Character: Lily 神情專注/);
    assert.match(prompt, /4\) Camera: 中景/);
    assert.match(prompt, /Aspect ratio 16:9\./);
  }
});

test("REVISION line does not attach a sibling or previous still", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
  });
  assert.match(prompt, /REVISION: the FIRST attached reference image/);
  assert.doesNotMatch(prompt, /sibling frame/);
  assert.doesNotMatch(prompt, /previous still/);
});

test("assigned scene references sit after the anchor and before the cast", () => {
  const video = project();
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.referenceImages = [
    { id: "R1", url: "https://blob/r1.png", description: "shop" },
    { id: "R2", url: "https://blob/r2.png", description: "menu" },
  ];
  video.phaseA!.clips[0].referenceImageIds = ["R2"];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, ["https://blob/r2.png", "https://blob/c.png"]);
  assert.match(plan.prompt, /SCENE REFERENCE: attached image 1 shows/);
  assert.match(plan.prompt, /Attached image 2/);
});

test("clips without assigned references attach none", () => {
  const video = project();
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "shop" }];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, []);
  assert.doesNotMatch(plan.prompt, /SCENE REFERENCE/);
});

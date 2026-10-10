import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import {
  FRAME_PROMPT_BUDGET,
  IMAGE_PROMPT_MAX_CHARS,
  buildFramePrompt,
  compactSceneTextPrompt,
  frameSubmitPlan,
  framesWithClips,
  framesWithClipsReady,
} from "@/service/higgsfield/frame-prompts";
import { STYLE_IDS } from "@/model/style-id";
import { resetStyleOverlay } from "@/service/style/load-style";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import { surpriseVarietyPlan } from "@/service/director/surprise-interview";

before(() => installTestStyles());
after(() => uninstallTestStyles());

test("bookend stills attach the logo after the character refs and name it", () => {
  const logo = "https://blob/logo.png";
  const opening = { ...project(), skillSlug: "opening-director", logoUrl: logo };
  const plan = frameSubmitPlan(opening, 1, "start");
  assert.deepEqual(plan.refs, [logo]);
  assert.match(plan.prompt, /BRAND LOGO: attached image 1 is the brand logo/);
});

test("custom text style is the last reference and only describes lettering", () => {
  const image = "https://blob/lettering.png";
  const plan = frameSubmitPlan({ ...project(), textStyleImageUrl: image, subtitleLook: "clean" }, 1, "start");
  assert.deepEqual(plan.refs, [image]);
  assert.match(plan.prompt, /attached image 1, a lettering sample/);
  assert.doesNotMatch(plan.prompt, /geometric sans/);
});

test("the selected text style stays while the scene sentence keeps place and size", () => {
  const bold = buildFramePrompt({ ...project(), subtitleLook: "bold" }, 1, "start");
  const clean = buildFramePrompt({ ...project(), subtitleLook: "clean" }, 1, "start");
  assert.match(bold, /yellow dry-brush/);
  assert.match(clean, /torn-paper strips/);
  assert.doesNotMatch(bold, /bottom 18%/);
  assert.doesNotMatch(clean, /55% of the way/);
  const written = project();
  written.subtitleLook = "clean";
  written.phaseA!.clips[0].explainerScene = 'Subtitle: large text in the dead center, exactly "vo".';
  const prompt = buildFramePrompt(written, 1, "start");
  assert.match(prompt, /torn-paper strips/);
  assert.match(prompt, /dead center/);
  assert.match(prompt, /subtitle Look line above/);

  const custom = frameSubmitPlan(
    { ...project(), subtitleLook: "handwritten", textStyleImageUrl: "https://blob/mine.png" },
    1,
    "start",
  );
  assert.deepEqual(custom.refs, ["https://blob/mine.png"]);
  assert.match(custom.prompt, /attached image 1, a lettering sample/);
  assert.doesNotMatch(custom.prompt, /yellow dry-brush|torn-paper strips|thick black marker/);
});

test("every director attaches the selected text-style sample", () => {
  const image = "https://blob/lettering.png";
  for (const skillSlug of ["outfit-reel-director", "listicle-director", "surprise-interview-director"]) {
    const plan = frameSubmitPlan({ ...project(), skillSlug, textStyleImageUrl: image }, 1, "start");
    assert.ok(plan.refs.includes(image), skillSlug);
    assert.match(plan.prompt, /lettering sample/);
  }
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

test("doodle frame prompt uses the loaded style, no hard-coded whiteboard literal", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /doodle name short video/);
  assert.match(prompt, /Canvas: doodle canvas/);
  assert.match(prompt, /Look: doodle look/);
  assert.doesNotMatch(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video keeps its canvas while subtitle look stays independent", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /pixel name short video/);
  assert.match(prompt, /pixel canvas/);
  assert.match(prompt, /thick black marker/);
  assert.doesNotMatch(prompt, /pixel typography/);
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

test("whiteboard explainer stills keep the character silent and draw the mechanism graph", () => {
  const cartoon = project();
  cartoon.skillSlug = "cartoon-explainer-video-director";
  assert.match(buildFramePrompt(cartoon, 1, "start"), /Silent demonstrator/);
  assert.match(buildFramePrompt(cartoon, 1, "end"), /explanation graph/);
  assert.match(buildFramePrompt(cartoon, 1, "end"), /beat title/);
  assert.doesNotMatch(buildFramePrompt(cartoon, 1, "end"), /STEP N|STEP 1/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /Silent demonstrator/);
});

test("whiteboard explainer with a cast zooms, walks, and draws extra objects", () => {
  const cartoon = project();
  cartoon.skillSlug = "cartoon-explainer-video-director";
  cartoon.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Scro",
      blueprintUrl: "https://blob/scro.png",
      prompt: "sheet",
    },
  ];
  const end = buildFramePrompt(cartoon, 1, "end", { anchor: { kind: "clip-start" } });
  assert.match(end, /same side/);
  assert.match(end, /left-to-right or right-to-left/);
  assert.match(end, /feet off the ground/);
  assert.match(end, /point toward the camera/);
  assert.match(end, /not a neutral stand/);
  assert.match(end, /Camera angle and pose MAY change/);
  assert.match(end, /other side/);
  assert.doesNotMatch(end, /Same camera, character size/);
  assert.equal(end.match(/same side/g)?.length, 1);
  assert.equal(end.match(/Camera angle/gi)?.length, 2);
});

test("the still paints the director's subtitle sentence and does not add a second layout", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.aspectRatio = "9:16";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Lily: "We made it."';
  story.phaseA!.clips[0].explainerScene =
    'Subtitle (spell exactly): "We made it." Giant text in the dead center of the frame.';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /dead center/);
  assert.match(prompt, /We made it\./);
  assert.doesNotMatch(prompt, /bottom 18%/);
  assert.doesNotMatch(prompt, /55% of the way/);
  assert.doesNotMatch(prompt, /Ignore any storyboard/);
  assert.doesNotMatch(prompt, /not in a bottom band/);

  const face = project();
  face.skillSlug = "talking-head-director";
  face.aspectRatio = "9:16";
  face.sceneTextEnabled = true;
  face.phaseA!.clips[0].explainerScene = 'Subtitle: one giant line in the dead center, exactly "We made it."';
  const reel = buildFramePrompt(face, 1, "start");
  assert.match(reel, /dead center/);
  assert.doesNotMatch(reel, /a little below the vertical center/);
  assert.doesNotMatch(reel, /bottom 18%/);
  assert.match(reel, /9:16 vertical safe area/);
  assert.match(reel, /empty band at the top/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /9:16 vertical safe area/);
});

test("story-short subtitles show only the spoken words, never the speaker name", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Scro - Cinematic: "One clone, unlimited environments."';
  story.phaseA!.clips[0].explainerScene = 'Subtitle (spell exactly): "One clone, unlimited environments."';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /One clone,/);
  assert.doesNotMatch(prompt, /Scro - Cinematic/);
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

test("a scene without a subtitle sentence does not get a second subtitle block", () => {
  const off = project();
  off.sceneTextEnabled = false;
  const prompt = buildFramePrompt(off, 1, "start");
  assert.match(prompt, /Look: doodle look/);
  assert.doesNotMatch(prompt, /Subtitle \(spell exactly\)/);
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
  assert.doesNotMatch(start, /52% and 60%/);
  assert.doesNotMatch(start, /Marker line \(spell exactly\)/);
  assert.doesNotMatch(start, /bottom 18%/);
  assert.doesNotMatch(start, /SECOND BEAT/);
  assert.match(end, /Scene: 尺變成回歸線/);
  assert.doesNotMatch(end, /First beat/);
});

test("whiteboard stills keep the selected subtitle look instead of the visual style lettering", () => {
  installTestStyles(
    STYLE_IDS.map((id) =>
      id === "paper-cutout"
        ? testStyle(id, {
            letteringLayout: "Layout: cut-paper VO at 40% height.",
            letteringLine1: "Line 1 is torn dark-ink paper.",
            letteringLine2: "Line 2 is a sunflower paper strip.",
            beatTitleLayout: "Beat title on a kraft tag at 20%.",
            reelLayout: "Reel cut-paper captions at 70%.",
          })
        : testStyle(id),
    ),
  );
  const dual = project("paper-cutout");
  dual.skillSlug = "cartoon-explainer-video-director";
  dual.phaseA!.clips[0] = {
    ...dual.phaseA!.clips[0],
    startVo: "First beat.",
    endVo: "Second beat.",
    englishVo: "First beat. Second beat.",
  };
  const start = buildFramePrompt(dual, 1, "start");
  assert.doesNotMatch(start, /40% height/);
  assert.doesNotMatch(start, /torn dark-ink paper/);
  assert.match(start, /thick black marker/);
  assert.doesNotMatch(start, /52% and 60%/);
  assert.doesNotMatch(start, /hand-drawn all-caps marker/);
  installTestStyles();
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
  assert.doesNotMatch(start, /First beat/);
  assert.doesNotMatch(start, /52% and 60%/);
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
  assert.match(prompt, /HELLO/);
  assert.doesNotMatch(prompt, /Subtitle \(spell exactly\): "vo"/);
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
  story.phaseA!.clips[0].explainerScene = '整段同一個畫面描述。Subtitle (spell exactly): "Whole line."';
  story.phaseA!.clips[0].englishVo = "Whole line.";
  const start = buildFramePrompt(story, 1, "start");
  const end = buildFramePrompt(story, 1, "end");
  assert.match(start, /Scene: 整段同一個畫面描述/);
  assert.match(end, /Scene: 整段同一個畫面描述/);
  assert.match(start, /Whole line/);
  assert.match(end, /Whole line/);
  assert.doesNotMatch(start, /55% of the way/);
});

test("a long Cantonese prompt keeps the exact line inside Ideogram's cap", () => {
  const full = [
    'Marker line (spell exactly): "你啲貨幾靚都好喎，"',
    "Scene: 紙箱寫住「好產品」。",
    "Identity notes (match these):",
    "x".repeat(4000),
  ].join("\n");
  const compact = compactSceneTextPrompt(full, "9:16");
  assert.ok(compact.length <= 2048, `${compact.length} chars`);
  assert.match(compact, /你啲貨幾靚都好喎，/);
  assert.match(compact, /「好產品」/);
});

test("Cantonese voiceover is painted as written Chinese", () => {
  const video = project();
  video.language = "yue";
  video.phaseA!.clips[0].englishVo = "你啲貨幾靚都好喎";
  video.phaseA!.clips[0].explainerScene = "紙箱寫住「好產品」。字幕：你些貨幾漂亮都好。";
  const prompt = buildFramePrompt(video, 1, "start");
  assert.match(prompt, /你些貨幾漂亮都好/);
  assert.match(prompt, /好產品/);
});

test("enabled scene text keeps the director subtitle inside the scene", () => {
  const on = project();
  on.sceneTextEnabled = true;
  on.sceneTextLanguage = "zh-Hant";
  on.phaseA!.clips[0].explainerScene = 'Subtitle (spell exactly): "vo"。置中放大。';
  const prompt = buildFramePrompt(on, 1, "start");
  assert.match(prompt, /Subtitle \(spell exactly\): "vo"/);
  assert.match(prompt, /置中放大/);
  const sceneAt = prompt.indexOf("Scene:");
  const subAt = prompt.indexOf("spell exactly");
  assert.ok(sceneAt >= 0 && subAt > sceneAt, "subtitle stays inside the scene");
  assert.doesNotMatch(prompt, /On-canvas subtitles ON/);
  assert.doesNotMatch(prompt, /never subtitles or captions/i);
});

test("scene writing stays in the still prompt", () => {
  const off = project();
  off.sceneTextEnabled = false;
  off.phaseA!.clips[0].explainerScene = "A sign reads HELLO";
  const prompt = buildFramePrompt(off, 1, "end");
  assert.match(prompt, /HELLO/);
  assert.doesNotMatch(prompt, /Only the subtitle line/);
  assert.doesNotMatch(prompt, /On-canvas subtitles ON/);
});

test("without a cast, the text characterLock stays authoritative", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /Locked character \(must look identical in every frame\): lock/);
  assert.doesNotMatch(prompt, /Cast reference sheets are attached/);
});

test("listicle item stills name only that item; the last still lists every title", () => {
  const list = project();
  list.skillSlug = "listicle-director";
  list.sceneTextEnabled = false;
  const row = list.phaseA!.clips[0];
  list.phaseA!.clips = [
    { ...row, clipNumber: 1, narrativeJob: "hook", englishVo: "Two money leaks." },
    { ...row, clipNumber: 2, narrativeJob: "item 1 of 2", englishVo: "Unused subscriptions." },
    { ...row, clipNumber: 3, narrativeJob: "full list", englishVo: "Cancel one today." },
  ];
  const item = buildFramePrompt(list, 2, "start");
  assert.match(item, /only this item/i);
  assert.match(item, /low angle/);
  assert.match(item, /Unused subscriptions/);
  assert.match(item, /On-canvas subtitles ON/);
  assert.match(item, /Subtitle \(spell exactly\): "Unused subscriptions\."/);
  assert.doesNotMatch(item, /Two money leaks/);
  assert.doesNotMatch(item, /No on-canvas text/);
  const full = buildFramePrompt(list, 3, "start");
  assert.match(full, /numbered list/i);
  assert.match(full, /Unused subscriptions/);
});

test("framesWithClips queues start and end for every clip", () => {
  const next = framesWithClips(project(), [1]);
  assert.deepEqual(
    next.map((frame) => `${frame.clipNumber}:${frame.position}:${frame.status}`),
    ["1:start:queued", "1:end:queued"],
  );
});

test("framesWithClipsReady hydrates styles before queueing prompts", async () => {
  resetStyleOverlay();
  const next = await framesWithClipsReady(project(), [1], async () => {
    installTestStyles();
  });
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
    "3) Light: " + "冷光，".repeat(150) + '4) Camera: 中景，角色在畫面右側。Subtitle (spell exactly): "We made it to the top."';
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

test("trimming drops generic rules and Light before the Scene, and Set keeps its labels", () => {
  const long = project();
  long.skillSlug = "cartoon-explainer-video-director";
  long.sceneTextEnabled = true;
  long.phaseA!.visualWorld = "寒冷的山頂。".repeat(200);
  long.phaseA!.clips[0].startScene =
    "1) Character: Lily stands on the right, both hands on a crate. 2) Set: A snowy ridge. A sled marked 「BASE」 waits below " +
    "and a flag 「SUMMIT」 flies above, ".repeat(220) +
    "3) Light: " + "cold blue rim light, ".repeat(100) + "4) Camera: medium shot from the left.";
  long.phaseA!.clips[0].motionCamera = "0–3s: " + "she climbs the rocks, ".repeat(120) + "; 3–5s: she stops.";
  const prompt = buildFramePrompt(long, 1, "start");
  assert.ok(prompt.length <= FRAME_PROMPT_BUDGET, `${prompt.length} chars`);
  assert.doesNotMatch(prompt, /Render detail:/);
  assert.doesNotMatch(prompt, /3\) Light/);
  assert.match(prompt, /1\) Character: Lily stands on the right, both hands on a crate\./);
  assert.match(prompt, /4\) Camera: medium shot from the left\./);
  assert.match(prompt, /「BASE」/);
  assert.match(prompt, /「SUMMIT」/);
});

test("REVISION line does not attach a sibling or previous still", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
  });
  assert.match(prompt, /REVISION: the FIRST attached reference image/);
  assert.doesNotMatch(prompt, /sibling frame/);
  assert.doesNotMatch(prompt, /previous still/);
});

test("talking-head stills keep only the first character", () => {
  const video = project();
  video.skillSlug = "talking-head-director";
  video.cast = ["Lily", "Max"].map((name) => ({
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name,
    blueprintUrl: `https://blob/${name}.png`,
    prompt: "",
  }));
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, ["https://blob/Lily.png"]);
  assert.match(plan.prompt, /SOLO: exactly one person/);
  assert.match(plan.prompt, /Cast: Lily\./);
  assert.doesNotMatch(plan.prompt, /Max/);

  video.skillSlug = "full-body-talking-head-director";
  const body = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(body.refs, ["https://blob/Lily.png"]);
  assert.match(body.prompt, /SOLO: exactly one person/);
});

test("talking-head background photos replace the bookshelf and attach as the room", () => {
  const video = project();
  video.skillSlug = "talking-head-director";
  video.backgroundImageUrls = ["https://blob/room-a.png", "https://blob/room-b.png"];
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.referenceImages = [{ id: "R1", url: "https://blob/other.png", description: "shop" }];
  video.phaseA!.clips[0].referenceImageIds = ["R1"];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, ["https://blob/c.png", "https://blob/room-a.png", "https://blob/room-b.png"]);
  assert.match(plan.prompt, /BACKGROUND REFERENCE: attached images 2–3 show the room/);
  assert.match(plan.prompt, /instead of a bookshelf/);
  assert.doesNotMatch(plan.prompt, /https:\/\/blob\/other.png/);
});

test("assigned scene references sit after the character so the photo's face does not win", () => {
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
  assert.deepEqual(plan.refs, ["https://blob/c.png", "https://blob/r2.png"]);
  assert.match(plan.prompt, /SCENE REFERENCE: attached image 2 shows/);
  assert.match(plan.prompt, /Do not copy the person, face, or hairstyle/);
  assert.match(plan.prompt, /Do not redress the character/);
  assert.match(plan.prompt, /Attached image 1/);
});

test("a clothing instruction copies garments and still locks the character's face", () => {
  const video = project();
  video.skillSlug = "product-demo-director";
  video.source = "Scro opens the box. 衣服跟參考圖。";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Scro",
      blueprintUrl: "https://blob/scro.png",
      prompt: "",
    },
  ];
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "unboxing" }];
  video.phaseA!.clips[0].referenceImageIds = ["R1"];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, ["https://blob/scro.png", "https://blob/r1.png"]);
  assert.match(plan.prompt, /copy only the garments/i);
  assert.match(plan.prompt, /Do not copy the person, face, or hairstyle/);
  assert.match(plan.prompt, /Face and hair stay on the selected character/);
  assert.doesNotMatch(plan.prompt, /Do not redress the character/);
});

// Sunburst takes 16 references, so both scene photos still fit beside the cast.
test("scene references are capped to the edit model's free slots", () => {
  const video = project();
  video.sceneTextLanguage = "zh-Hant";
  video.cast = ["Lily", "Max"].map((name) => ({
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name,
    blueprintUrl: `https://blob/${name}.png`,
    prompt: "",
  }));
  video.referenceImages = [
    { id: "R1", url: "https://blob/r1.png", description: "shop" },
    { id: "R2", url: "https://blob/r2.png", description: "menu" },
  ];
  video.phaseA!.clips[0].referenceImageIds = ["R1", "R2"];
  video.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/start.png" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  const end = frameSubmitPlan(video, 1, "end");
  assert.deepEqual(end.refs, [
    "https://blob/start.png",
    "https://blob/Lily.png",
    "https://blob/Max.png",
    "https://blob/r1.png",
    "https://blob/r2.png",
  ]);
  assert.match(end.prompt, /SCENE REFERENCE/);

  const start = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(start.refs, [
    "https://blob/Lily.png",
    "https://blob/Max.png",
    "https://blob/r1.png",
    "https://blob/r2.png",
  ]);
  assert.match(start.prompt, /SCENE REFERENCE/);
});

test("end frame with a composition lock keeps the lock framing over the scene reference", () => {
  const video = project();
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "shop" }];
  video.phaseA!.clips[0].referenceImageIds = ["R1"];
  video.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/start.png" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  const plan = frameSubmitPlan(video, 1, "end");
  assert.deepEqual(plan.refs, ["https://blob/start.png", "https://blob/r1.png"]);
  assert.match(plan.prompt, /SCENE REFERENCE: attached image 2 shows .* keep the COMPOSITION LOCK framing/);
});

test("next clip's opening with a scene reference drops the same-place rule", () => {
  const prompt = buildFramePrompt(
    (() => {
      const video = project();
      video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "menu" }];
      video.phaseA!.clips[0].referenceImageIds = ["R1"];
      return video;
    })(),
    1,
    "start",
    { anchor: { kind: "prev-end" } },
  );
  assert.match(prompt, /CONTINUITY REFERENCE: attached image 1/);
  assert.match(prompt, /SCENE REFERENCE: attached image 2 shows .* follow their composition/);
  assert.doesNotMatch(prompt, /Do not invent a new room/);
});

test("a preloaded user style supplies look and lettering", () => {
  const custom = renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft edges",
    letteringLayout: "Layout: cut-paper VO at 40% height.",
    letteringLine1: "Line 1 is torn dark-ink paper.",
  }));
  custom.id = new ObjectId().toHexString();
  const video = project();
  video.styleId = custom.id;
  video.skillSlug = "cartoon-explainer-video-director";
  const prompt = buildFramePrompt(video, 1, "start", { style: custom });
  assert.match(prompt, /torn kraft edges/);
  assert.doesNotMatch(prompt, /torn dark-ink paper/);
  assert.doesNotMatch(prompt, /40% height/);
  assert.match(prompt, /thick black marker/);
});

test("clips without assigned references attach none", () => {
  const video = project();
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "shop" }];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, []);
  assert.doesNotMatch(plan.prompt, /SCENE REFERENCE/);
});

test("outfit reel stills copy the clothing photo on start and end", () => {
  const video = project();
  video.skillSlug = "outfit-reel-director";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "outfit" }];
  video.phaseA!.clips[0].referenceImageIds = ["R1"];
  video.phaseA!.clips[0].startScene =
    "Character: Lily stands with both hands relaxed at the sides, wearing the complete outfit from the clothing reference. Set: studio. Camera: locked eye-level full-body, camera directly in front of her.";
  video.phaseA!.clips[0].endScene =
    "Character: Lily stands with weight on the back hip, wearing the complete outfit from the clothing reference. Set: studio. Camera: the same eye-level front, camera a half-step closer.";
  video.frames = [
    {
      clipNumber: 1,
      position: "start",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/start.png",
    },
  ];
  const start = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(start.refs, ["https://blob/c.png", "https://blob/r1.png"]);
  assert.match(start.prompt, /IDENTITY LOCK/);
  assert.match(start.prompt, /energetic and happy/);
  assert.match(start.prompt, /CLOTHING REFERENCE/);
  assert.match(start.prompt, /style, cut, colour/);
  assert.match(start.prompt, /START FRAME CAMERA/);
  assert.doesNotMatch(start.prompt, /athletic shorts/);
  const end = frameSubmitPlan(video, 1, "end");
  assert.equal(end.anchor, undefined);
  assert.deepEqual(end.refs, ["https://blob/c.png", "https://blob/r1.png"]);
  assert.match(end.prompt, /END FRAME CAMERA/);
  assert.doesNotMatch(end.prompt, /Keep the same camera/);
});

test("outfit reel later starts are a hard cut and do not attach the previous end", () => {
  const video = project();
  video.skillSlug = "outfit-reel-director";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.phaseA!.clipCount = 2;
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "outfit" }];
  video.phaseA!.clips.push({
    clipNumber: 2,
    timeRange: "5-8s",
    durationSeconds: 3,
    narrativeJob: "Front to left",
    explainerScene: "same outfit, new camera",
    motionCamera: "0–0.2s hold; 0.2–1.4s the camera arcs; 1.4–3s hold.",
    englishVo: "(no dialogue)",
    startScene:
      "Character: Lily stands with both hands relaxed at the sides, wearing the complete outfit. Set: studio. Light: daylight. Camera: eye-level full-body directly in front.",
    endScene:
      "Character: Lily stands with weight on the back hip, wearing the complete outfit. Set: studio. Light: daylight. Camera: eye-level full-body 3/4 after the camera has arced to HER left.",
    bgmSfx: "No background music. One sound effect only.",
    referenceImageIds: ["R1"],
  });
  video.frames = [
    {
      clipNumber: 1,
      position: "end",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/prev-end.png",
    },
  ];
  const start = frameSubmitPlan(video, 2, "start");
  assert.equal(start.anchor, undefined);
  assert.deepEqual(start.refs, ["https://blob/c.png", "https://blob/r1.png"]);
  assert.match(start.prompt, /NEW CAMERA/);
  assert.match(start.prompt, /directly in front/);
  assert.doesNotMatch(start.prompt, /previous clip's END frame/);
});

test("surprise hook stills drop from above, zoom in, and use shock-poster type", () => {
  const video = project();
  video.skillSlug = "surprise-interview-director";
  video.phaseA!.clips[0].englishVo = 'Ada: "I spent $0 on ads and got 37 clients."';
  video.phaseA!.clips[0].startScene =
    "Character: Ada looks into the lens. Set: studio. Light: daylight. Camera: locked close-up.";
  video.phaseA!.clips[0].endScene =
    "Character: Ada looks surprised. Set: studio. Light: daylight. Camera: locked close-up.";
  video.frames = [
    {
      clipNumber: 1,
      position: "start",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/start.png",
    },
  ];
  const start = frameSubmitPlan(video, 1, "start");
  assert.match(start.prompt, /HOOK CAMERA/);
  assert.match(start.prompt, /looking down/);
  assert.match(start.prompt, /Do not flip the picture/);
  assert.match(start.prompt, /thick black marker/);
  assert.doesNotMatch(start.prompt, /ultra-bold ultra-condensed/);
  assert.doesNotMatch(start.prompt, /solid black rectangle/);
  assert.doesNotMatch(start.prompt, /mustard/);
  assert.match(start.prompt, /37 clients/);
  assert.match(start.prompt, /I spent \$0 on ads and got 37 clients/);
  assert.doesNotMatch(start.prompt, /subtitle band across the bottom/);
  const end = frameSubmitPlan(video, 1, "end");
  assert.equal(end.anchor, undefined);
  assert.match(end.prompt, /dropped down and snapped a zoom-in/);
  assert.doesNotMatch(end.prompt, /Keep the same camera/);
});

test("later surprise clips change the poster place and skip the previous framing", () => {
  const video = project();
  video.skillSlug = "surprise-interview-director";
  video.sceneTextEnabled = true;
  video.phaseA!.clips.push({
    clipNumber: 2,
    timeRange: "3-7s",
    durationSeconds: 4,
    narrativeJob: "interview",
    explainerScene: "seated",
    motionCamera: "camera locked",
    englishVo: "It works because the first client told a friend.",
    referenceTranslation: "r",
    bgmSfx: "s",
    startScene: "Character: Ada sits. Set: studio. Light: daylight. Camera: locked medium shot.",
    endScene: "Character: Ada nods. Set: studio. Light: daylight. Camera: locked medium shot.",
  });
  video.frames = [
    {
      clipNumber: 1,
      position: "end",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/prev-end.png",
    },
  ];
  const place = surpriseVarietyPlan(video.phaseA!).find((item) => item.clipNumber === 2)?.place;
  const start = frameSubmitPlan(video, 2, "start");
  assert.equal(start.anchor, undefined);
  assert.match(start.prompt, /THIS CLIP'S CAMERA AND POSE/);
  assert.match(start.prompt, /thick black marker/);
  assert.match(start.prompt, /first client told a friend/);
  assert.match(start.prompt, new RegExp(place === "top" ? "SUBTITLE PLACE: TOP" : place === "middle" ? "SUBTITLE PLACE: MIDDLE" : "SUBTITLE PLACE: BOTTOM"));
  assert.doesNotMatch(start.prompt, /HOOK CAMERA/);
  assert.doesNotMatch(start.prompt, /white band/);
  assert.doesNotMatch(start.prompt, /hand-lettered/);
});

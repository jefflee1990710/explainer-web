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
import { stripLetterboxBars } from "@/service/higgsfield/flatten";
import sharp from "sharp";

before(() => installTestStyles());
after(() => uninstallTestStyles());

test("bookend stills attach the logo after the character refs and name it", () => {
  const logo = "https://blob/logo.png";
  const opening = { ...project(), skillSlug: "opening-director", logoUrl: logo };
  const plan = frameSubmitPlan(opening, 1, "start");
  assert.deepEqual(plan.refs, [logo]);
  assert.match(plan.prompt, /BRAND LOGO: attached image 1 is the brand logo/);
});

test("scene image generation never attaches textStyleImageUrl or paints spoken subtitles", () => {
  const image = "https://blob/lettering.png";
  const plan = frameSubmitPlan({ ...project(), textStyleImageUrl: image, subtitleLook: "clean" }, 1, "start");
  assert.deepEqual(plan.refs, []);
  assert.doesNotMatch(plan.prompt, /lettering sample/);
  assert.doesNotMatch(plan.prompt, /torn-paper strips/);
});

test("scene prompts strip Subtitle sentences while keeping scene descriptions", () => {
  const written = project();
  written.subtitleLook = "clean";
  written.phaseA!.clips[0].explainerScene = 'Alice runs in the park. Subtitle: large text in the dead center, exactly "vo".';
  const prompt = buildFramePrompt(written, 1, "start");
  assert.match(prompt, /Alice runs in the park\./);
  assert.doesNotMatch(prompt, /Subtitle:/);
  assert.doesNotMatch(prompt, /dead center/);
});

test("directors never attach a subtitle look sample to scene image references", () => {
  const image = "https://blob/lettering.png";
  for (const skillSlug of ["outfit-reel-director", "outfit-change-director", "listicle-director", "surprise-interview-director"]) {
    const plan = frameSubmitPlan({ ...project(), skillSlug, textStyleImageUrl: image }, 1, "start");
    assert.ok(!plan.refs.includes(image), skillSlug);
    assert.doesNotMatch(plan.prompt, /lettering sample/);
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

test("a cartoon still keeps in-scene bracket labels and strips Subtitle sentences", () => {
  const cartoon = project();
  cartoon.skillSlug = "cartoon-explainer-video-director";
  cartoon.sceneTextEnabled = true;
  cartoon.phaseA!.clips[0].explainerScene =
    'floating label 「5 Camera Motions You Need to Know!」. Subtitle: "5 Camera Motions You Need to Know!"';
  const prompt = buildFramePrompt(cartoon, 1, "start");
  assert.match(prompt, /「5 Camera Motions You Need to Know!」/);
  assert.doesNotMatch(prompt, /Subtitle:/);

  const other = project();
  other.sceneTextEnabled = true;
  other.phaseA!.clips[0].explainerScene = cartoon.phaseA!.clips[0].explainerScene;
  assert.match(buildFramePrompt(other, 1, "start"), /「5 Camera Motions You Need to Know!」/);
  assert.doesNotMatch(buildFramePrompt(other, 1, "start"), /Subtitle:/);
});

test("whiteboard stills keep diagram labels after the scene is trimmed and omit spoken subtitles", () => {
  const cartoon = project("realistic");
  cartoon.skillSlug = "cartoon-explainer-video-director";
  cartoon.subtitleLook = "clean";
  const set = `2) Set: ${"dark studio floor ".repeat(40)}`;
  cartoon.phaseA!.clips[0] = {
    ...cartoon.phaseA!.clips[0],
    startScene: `1) Character: Scro stands by a dial labeled 「LIGHT CONTROL」. ${set} 3) Light: a soft key. 4) Camera: 50mm f/1.4. Subtitle centered on torn paper: "Four lighting techniques you must know. Everything begins inside a dark studio."`,
    endScene: "1) Character: Scro has turned the dial.",
    startVo: "Four lighting techniques you must know.",
    endVo: "Everything begins inside a dark studio.",
    englishVo: "Four lighting techniques you must know. Everything begins inside a dark studio.",
  };
  const prompt = buildFramePrompt(cartoon, 1, "start");
  assert.doesNotMatch(prompt, /Four lighting techniques you must know/);
  assert.doesNotMatch(prompt, /Everything begins inside a dark studio/);
  assert.match(prompt, /「LIGHT CONTROL」/);
});

test("cartoon stills keep bracket labels on props and omit spoken subtitles", () => {
  const cartoon = project();
  cartoon.skillSlug = "cartoon-explainer-video-director";
  cartoon.subtitleLook = "clean";
  cartoon.phaseA!.clips[0].startScene =
    'card labeled 「VIRAL SHOTS」. Subtitle (spell exactly): "Save it now!"';
  cartoon.phaseA!.clips[0].startVo = "Save it now!";
  const prompt = buildFramePrompt(cartoon, 1, "start");
  assert.doesNotMatch(prompt, /Save it now!/);
  assert.match(prompt, /「VIRAL SHOTS」/);
});

test("doodle frame prompt uses the loaded style, no hard-coded whiteboard literal", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /doodle name short video/);
  assert.match(prompt, /Canvas: doodle canvas/);
  assert.match(prompt, /Look: doodle look/);
  assert.doesNotMatch(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video keeps its canvas and omits subtitle look lines", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /pixel name short video/);
  assert.match(prompt, /pixel canvas/);
  assert.doesNotMatch(prompt, /thick black marker/);
  assert.doesNotMatch(prompt, /pixel typography/);
});

test("end frame is the opening still after the camera motion", () => {
  const video = project();
  video.phaseA!.clips[0].startScene = "Camera: wide shot of the desk from the left.";
  video.phaseA!.clips[0].endScene = "the mug is now centered.";
  video.phaseA!.clips[0].motionCamera = "0–2s the camera pushes in; 2–5s it settles on a close-up from the front.";
  const prompt = buildFramePrompt(video, 1, "end", { anchor: { kind: "clip-start" } });
  assert.match(prompt, /Camera landing:/);
  assert.match(prompt, /Opening: Camera: wide shot of the desk from the left/);
  assert.match(prompt, /Motion: 0–2s the camera pushes in/);
  assert.match(prompt, /where the camera lands/);
  assert.match(prompt, /camera motion's landing/);
  assert.match(prompt, /5–6s/);
  assert.doesNotMatch(prompt, /Keep the same camera/);
  assert.doesNotMatch(prompt, /SAME locked camera/);
  assert.doesNotMatch(buildFramePrompt(video, 1, "start"), /Camera landing:/);
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
  assert.match(prompt, /camera motion's landing/);
  assert.match(prompt, /Do not invent a new room/);
  assert.doesNotMatch(prompt, /Do not invent a new room or camera/);
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

test("whiteboard explainer with a cast locks the camera and keeps the 70/30 diagram hierarchy", () => {
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
  assert.match(end, /70\/30 Diagram-First Spatial Hierarchy/);
  assert.match(end, /Keep the same camera, shot size, angle, crop, set, lighting, character size, and screen position/);
  assert.match(end, /other side/);
  assert.equal(end.match(/same side/g)?.length, 1);
  assert.equal(end.match(/Camera angle/gi)?.length, 1);
});

test("stills strip the director's subtitle sentence and keep the 9:16 safe area", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.aspectRatio = "9:16";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Lily: "We made it."';
  story.phaseA!.clips[0].explainerScene =
    'Lily stands on the ridge. Subtitle (spell exactly): "We made it." Giant text in the dead center of the frame.';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /Lily stands on the ridge\./);
  assert.doesNotMatch(prompt, /We made it\./);
  assert.doesNotMatch(prompt, /Subtitle/i);

  const face = project();
  face.skillSlug = "talking-head-director";
  face.aspectRatio = "9:16";
  face.sceneTextEnabled = true;
  face.phaseA!.clips[0].explainerScene = 'Seated on sofa. Subtitle: one giant line in the dead center, exactly "We made it."';
  const reel = buildFramePrompt(face, 1, "start");
  assert.doesNotMatch(reel, /We made it\./);
  assert.doesNotMatch(reel, /Subtitle:/);
  assert.match(reel, /9:16 IG Reel safe area/);
  assert.match(reel, /top 20%/);
  assert.match(reel, /bottom 20%/);
  assert.doesNotMatch(buildFramePrompt(project(), 1, "start"), /9:16 IG Reel safe area/);
});

test("story-short stills omit spoken subtitles and speaker names", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].englishVo = 'Scro - Cinematic: "One clone, unlimited environments."';
  story.phaseA!.clips[0].explainerScene = 'Scro walks down the hall. Subtitle (spell exactly): "One clone, unlimited environments."';
  const prompt = buildFramePrompt(story, 1, "start");
  assert.match(prompt, /Scro walks down the hall\./);
  assert.doesNotMatch(prompt, /One clone,/);
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

test("an orbit end still does not attach the start frame, and names the landed angle", () => {
  const arc = project();
  arc.skillSlug = "story-short-director";
  arc.cast = [
    { characterId: new ObjectId(), versionId: new ObjectId(), name: "Scro", blueprintUrl: "https://blob/c.png", prompt: "" },
  ];
  arc.phaseA!.clips[0].motionCamera =
    "0-2s Scro grasps rig dial with right hand; 2-5s smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view.";
  arc.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/start.png" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  const plan = frameSubmitPlan(arc, 1, "end");
  assert.equal(plan.anchor, undefined);
  assert.deepEqual(plan.refs, ["https://blob/c.png"]);
  assert.match(plan.prompt, /LANDED CAMERA: the move is finished/);
  assert.match(plan.prompt, /Draw only the landed angle: right 3\/4 view/);
  assert.match(plan.prompt, /opening angle was left profile/);
  assert.doesNotMatch(plan.prompt, /COMPOSITION LOCK/);
  assert.doesNotMatch(plan.prompt, /THIS CLIP'S START frame/);

  arc.frames.push({
    clipNumber: 1,
    position: "end",
    prompt: "p",
    status: "completed",
    blobUrl: "https://blob/end.png",
  });
  const opening = frameSubmitPlan(arc, 1, "start");
  assert.deepEqual(opening.refs, ["https://blob/c.png"]);
  assert.match(opening.prompt, /OPENING CAMERA: this still is before the camera moves/);
  assert.match(opening.prompt, /Draw only the opening angle: left profile/);

  arc.phaseA!.clips[0].motionCamera = "0–2s the camera pushes in; 2–5s it settles on a close-up.";
  const push = frameSubmitPlan(arc, 1, "end");
  assert.deepEqual(push.refs, ["https://blob/start.png", "https://blob/c.png"]);
  assert.match(push.prompt, /COMPOSITION LOCK: attached image 1 is THIS CLIP'S START frame/);
  assert.doesNotMatch(push.prompt, /LANDED CAMERA/);

  arc.phaseA!.clips[0].motionCamera =
    "0-2s Scro grasps rig dial with right hand; 2-5s smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view.";
  arc.phaseA!.clips[0].endUsesStartStill = true;
  const kept = frameSubmitPlan(arc, 1, "end");
  assert.deepEqual(kept.refs, ["https://blob/start.png", "https://blob/c.png"]);
  assert.match(kept.prompt, /COMPOSITION LOCK/);
  assert.doesNotMatch(kept.prompt, /LANDED CAMERA/);

  arc.phaseA!.clips[0].motionCamera = "0–2s the camera pushes in; 2–5s it settles on a close-up.";
  arc.phaseA!.clips[0].endUsesStartStill = false;
  const freed = frameSubmitPlan(arc, 1, "end");
  assert.deepEqual(freed.refs, ["https://blob/c.png"]);
  assert.match(freed.prompt, /LANDED CAMERA/);
  assert.doesNotMatch(freed.prompt, /COMPOSITION LOCK/);
});

test("diagram explainer end stills always keep the steady composition lock in every visual style", () => {
  const steady = project("realistic");
  steady.skillSlug = "cartoon-explainer-video-director";
  steady.sceneTextEnabled = true;
  steady.cast = [
    { characterId: new ObjectId(), versionId: new ObjectId(), name: "Scro", blueprintUrl: "https://blob/c.png", prompt: "" },
  ];
  steady.phaseA!.clips[0] = {
    ...steady.phaseA!.clips[0],
    startScene: 'Scro holds the card. Subtitle (spell exactly): "First beat. Second beat."',
    endScene: 'Scro has flipped the card. Subtitle (spell exactly): "First beat. Second beat."',
    startVo: "First beat.",
    endVo: "Second beat.",
    englishVo: "First beat. Second beat.",
    motionCamera: "0-5s Scro flips the card; camera pushes in smoothly on the diagram.",
  };
  steady.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/start.png" },
    { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  ];
  const end = frameSubmitPlan(steady, 1, "end");
  assert.deepEqual(end.refs, ["https://blob/start.png", "https://blob/c.png"]);
  assert.match(end.prompt, /COMPOSITION LOCK/);
  assert.doesNotMatch(end.prompt, /LANDED CAMERA/);
});

test("an end still without a start lock attaches the prop sheet and empty-set plate", () => {
  const arc = project();
  arc.skillSlug = "story-short-director";
  arc.cast = [
    { characterId: new ObjectId(), versionId: new ObjectId(), name: "Scro", blueprintUrl: "https://blob/c.png", prompt: "" },
  ];
  arc.objectSheetItems = [{ name: "gimbal", notes: "metal dial" }];
  arc.objectSheetUrl = "https://blob/sheet.png";
  arc.backgroundPlates = [
    {
      setId: "rooftop",
      name: "rooftop",
      notes: "railing and skyline",
      clipNumbers: [1],
      url: "https://blob/roof.png",
    },
  ];
  arc.phaseA!.clips[0].backgroundSetId = "rooftop";
  arc.phaseA!.clips[0].motionCamera =
    "2-5s smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view.";
  arc.phaseA!.clips[0].endUsesStartStill = false;
  arc.frames = [
    { clipNumber: 1, position: "start", prompt: "p", status: "completed", blobUrl: "https://blob/start.png" },
  ];
  const plan = frameSubmitPlan(arc, 1, "end");
  assert.deepEqual(plan.refs, [
    "https://blob/c.png",
    "https://blob/sheet.png",
    "https://blob/roof.png",
  ]);
  assert.match(plan.prompt, /OBJECT LOCK: attached image 2/);
  assert.match(plan.prompt, /BACKGROUND LOCK: attached image 3/);
  assert.doesNotMatch(plan.prompt, /COMPOSITION LOCK/);
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

test("whiteboard stills ignore visual style lettering and never embed subtitles", () => {
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
  assert.doesNotMatch(start, /52% and 60%/);
  assert.doesNotMatch(start, /hand-drawn all-caps marker/);
  assert.doesNotMatch(start, /Subtitle \(spell exactly\)/);
  installTestStyles();
});

test("legacy captions-off whiteboard video keeps prop labels and strips text policy from visualWorld", () => {
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
  assert.doesNotMatch(start, /Subtitle \(spell exactly\)/);
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

test("other skills keep a single scene on both stills and strip Subtitle sentences", () => {
  const story = project();
  story.skillSlug = "story-short-director";
  story.sceneTextEnabled = true;
  story.phaseA!.clips[0].explainerScene = '整段同一個畫面描述。Subtitle (spell exactly): "Whole line."';
  story.phaseA!.clips[0].englishVo = "Whole line.";
  const start = buildFramePrompt(story, 1, "start");
  const end = buildFramePrompt(story, 1, "end");
  assert.match(start, /Scene: 整段同一個畫面描述/);
  assert.match(end, /Scene: 整段同一個畫面描述/);
  assert.doesNotMatch(start, /Whole line/);
  assert.doesNotMatch(end, /Whole line/);
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

test("Cantonese scene keeps in-scene labels as written Chinese and strips subtitles", () => {
  const video = project();
  video.language = "yue";
  video.phaseA!.clips[0].englishVo = "你啲貨幾靚都好喎";
  video.phaseA!.clips[0].explainerScene = "紙箱寫住「好產品」。字幕：你些貨幾漂亮都好。";
  const prompt = buildFramePrompt(video, 1, "start");
  assert.doesNotMatch(prompt, /你些貨幾漂亮都好/);
  assert.match(prompt, /好產品/);
});

test("enabled scene text strips the director subtitle from the scene while allowing in-scene labels", () => {
  const on = project();
  on.sceneTextEnabled = true;
  on.sceneTextLanguage = "zh-Hant";
  on.phaseA!.clips[0].explainerScene = '木牌寫著「歡迎」。Subtitle (spell exactly): "vo"。置中放大。';
  const prompt = buildFramePrompt(on, 1, "start");
  assert.match(prompt, /木牌寫著「歡迎」/);
  assert.doesNotMatch(prompt, /Subtitle \(spell exactly\)/);
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
  assert.doesNotMatch(item, /On-canvas subtitles ON/);
  assert.doesNotMatch(item, /Subtitle \(spell exactly\)/);
  assert.doesNotMatch(item, /Two money leaks/);
  assert.doesNotMatch(item, /No on-canvas text/);
  const full = buildFramePrompt(list, 3, "start");
  assert.match(full, /numbered list/i);
  assert.match(full, /Unused subscriptions/);
});

test("whiteboard queues a start still only in every visual style", () => {
  const steady = project("realistic");
  steady.skillSlug = "cartoon-explainer-video-director";
  steady.frames = [
    { clipNumber: 1, position: "end", prompt: "old", status: "completed", blobUrl: "https://blob/end.png" },
  ];
  const next = framesWithClips(steady, [1]);
  assert.deepEqual(
    next.map((frame) => `${frame.position}:${frame.status}`),
    ["start:queued"],
  );
});

test("framesWithClips queues start only for non-talking-head clips and start+end for talking-head", () => {
  const next = framesWithClips(project(), [1]);
  assert.deepEqual(
    next.map((frame) => `${frame.clipNumber}:${frame.position}:${frame.status}`),
    ["1:start:queued"],
  );
  const th = project();
  th.skillSlug = "talking-head-director";
  const thNext = framesWithClips(th, [1]);
  assert.deepEqual(
    thNext.map((frame) => `${frame.clipNumber}:${frame.position}:${frame.status}`),
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
    ["1:start:queued"],
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
  assert.match(end, /hand off to the next clip in the same place/);
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

test("start stills send the full camera motion; end stills keep the landed beat", () => {
  const p = project();
  p.phaseA!.clips[0].motionCamera = "0–2s: Lily lifts the cup; 2–5s: she sets it down and smiles";
  const start = buildFramePrompt(p, 1, "start");
  const end = buildFramePrompt(p, 1, "end");
  assert.match(start, /Full camera motion/);
  assert.match(start, /consider the whole move/);
  assert.match(start, /this still is only the opening/);
  assert.match(start, /0–2s: Lily lifts the cup; 2–5s: she sets it down and smiles/);
  assert.match(end, /sets it down and smiles/);
  assert.match(end, /Camera landing:[\s\S]*lifts the cup/);
  assert.doesNotMatch(end.split("Camera landing:")[0], /lifts the cup/);
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
    assert.doesNotMatch(prompt, /We made it to the top\./);
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
  assert.match(prompt, /Sightline: show only what this camera can see/);
  assert.doesNotMatch(prompt, /3\) Light/);
  assert.match(prompt, /1\) Character: Lily stands on the right, both hands on a crate\./);
  assert.match(prompt, /4\) Camera: medium shot from the left\./);
  assert.match(prompt, /「BASE」/);
  assert.match(prompt, /「SUMMIT」/);
});

test("diagram explainers preserve multi-sentence structured Set diagrams under moderate trimming while non-diagram directors trim Set to the first sentence", () => {
  const multiSentenceSet =
    "1) Character: Lily stands in the lower-right 25% presenter zone pointing up-left. " +
    "2) Set: Structured Diagram Archetype — Causal Chain / Pipeline occupying 75% of the whiteboard canvas. " +
    "First node 「RAW DATA」 sits in a blue container box with an intake funnel. " +
    "Second node 「CLEANSE」 sits at a center-left filter gate with a red rejection chute. " +
    "Third node 「FEATURE MAP」 connects via thick directional arrows to the right. " +
    "Fourth node 「MODEL SIGNAL」 glows with a green checkmark badge on the far right. " +
    "3) Light: " + "bright flat studio light, ".repeat(110) +
    "4) Camera: locked medium-wide 2D planar shot.";

  const whiteboard = project();
  whiteboard.skillSlug = "cartoon-explainer-video-director";
  whiteboard.phaseA!.visualWorld = "Flat 2D whiteboard surface. ".repeat(120);
  whiteboard.phaseA!.clips[0].startScene = multiSentenceSet;
  whiteboard.phaseA!.clips[0].motionCamera = "0–3s: " + "arrows glide smoothly across the canvas, ".repeat(65) + "; 3–5s: holds.";
  const wbPrompt = buildFramePrompt(whiteboard, 1, "start");
  assert.match(wbPrompt, /First node 「RAW DATA」/);
  assert.match(wbPrompt, /Fourth node 「MODEL SIGNAL」 glows with a green checkmark badge/);

  const story = project();
  story.skillSlug = "story-short-director";
  story.phaseA!.visualWorld = "Flat 2D whiteboard surface. ".repeat(120);
  story.phaseA!.clips[0].explainerScene = multiSentenceSet;
  story.phaseA!.clips[0].motionCamera = "0–3s: " + "camera tracks across the room, ".repeat(140) + "; 3–5s: holds.";
  const storyPrompt = buildFramePrompt(story, 1, "start");
  assert.doesNotMatch(storyPrompt, /glowing with a green checkmark badge|glows with a green checkmark badge/);
});

test("realistic stills keep the light & camera rule and the Scene's Light under trimming; flat styles never get it", () => {
  const long = project("realistic");
  long.skillSlug = "cartoon-explainer-video-director";
  long.phaseA!.visualWorld = "寒冷的山頂。".repeat(200);
  long.phaseA!.clips[0].startScene =
    "1) Character: Lily stands on the right, both hands on a crate. 2) Set: A snowy ridge, " +
    "a sled waits below, ".repeat(120) +
    "3) Light: cold side key from the left with negative fill on her right cheek. 4) Camera: medium shot from the left, 85mm portrait lens, f/1.4, creamy bokeh background, subtle film grain.";
  long.phaseA!.clips[0].motionCamera = "0–3s: " + "she climbs the rocks, ".repeat(120) + "; 3–5s: she stops.";
  const prompt = buildFramePrompt(long, 1, "start");
  assert.match(prompt, /Realistic light & camera: light faces and surfaces with soft diffused ambient room light/);
  assert.match(prompt, /24mm \/ 35mm \/ 50mm \/ 85mm portrait lens/);
  assert.match(prompt, /deep focus f\/11 for environment or f\/4 to f\/1\.4 creamy bokeh background/);
  assert.match(prompt, /soft neutral daylight with gently cooler shadows/);
  assert.doesNotMatch(prompt, /Kodak Gold 200|halation on bright sources|gentle vignetting/);
  assert.match(prompt, /3\) Light: cold side key from the left with negative fill on her right cheek\./);
  assert.match(prompt, /4\) Camera: medium shot from the left, 85mm portrait lens, f\/1\.4, creamy bokeh background, subtle film grain\./);

  const flat = buildFramePrompt(project(), 1, "start");
  assert.doesNotMatch(flat, /Realistic light/);
});

test("REVISION line does not attach a sibling or previous still", () => {
  const prompt = buildFramePrompt(project(), 1, "start", {
    revision: { annotatedUrl: "https://x/annotated.png" },
  });
  assert.match(prompt, /REVISION: the FIRST attached reference image/);
  assert.doesNotMatch(prompt, /sibling frame/);
  assert.doesNotMatch(prompt, /previous still/);
});

test("talking-head realistic stills never paint subtitles or attach a lettering sample", () => {
  const video = project("realistic");
  video.skillSlug = "talking-head-director";
  video.subtitleOverlay = true;
  video.textStyleImageUrl = "https://blob/look.png";
  video.phaseA!.clips[0].englishVo = "Hello there.";
  video.phaseA!.clips[0].startScene = 'Person seated. Subtitle: one LARGE line, exactly "Hello there."';
  const prompt = buildFramePrompt(video, 1, "start");
  assert.match(prompt, /No on-canvas text/);
  assert.doesNotMatch(prompt, /Subtitle:/);
  assert.doesNotMatch(prompt, /Hello there\./);
  assert.doesNotMatch(prompt, /lettering sample/);
  const plan = frameSubmitPlan(video, 1, "start");
  assert.equal(plan.refs.includes("https://blob/look.png"), false);

  video.phaseA!.clips[0].startScene = "Person seated. No extra writing.";
  const blank = buildFramePrompt(video, 1, "start");
  assert.match(blank, /No on-canvas text/);
  assert.doesNotMatch(blank, /Subtitle:/);
  assert.doesNotMatch(blank, /Hello there/);
});

test("none on-screen text strips writing from the still prompt", () => {
  const video = project("realistic");
  video.skillSlug = "talking-head-director";
  video.sceneTextLanguage = "none";
  video.textStyleImageUrl = "https://blob/look.png";
  video.phaseA!.clips[0].englishVo = "Hello there.";
  video.phaseA!.clips[0].startScene = 'Person seated. Subtitle: one LARGE line, exactly "Hello there."';
  const prompt = buildFramePrompt(video, 1, "start");
  assert.match(prompt, /No on-canvas text/);
  assert.match(prompt, /no letters, no subtitle/);
  assert.doesNotMatch(prompt, /Subtitle:/);
  assert.doesNotMatch(prompt, /Hello there/);
  assert.doesNotMatch(prompt, /lettering sample/);
  const plan = frameSubmitPlan(video, 1, "start");
  assert.equal(plan.refs.includes("https://blob/look.png"), false);
});

test("talking-head stills never attach a lettering sample even when the storyboard has a Subtitle sentence", () => {
  const video = project("realistic");
  video.skillSlug = "talking-head-director";
  video.textStyleImageUrl = "https://blob/look.png";
  video.phaseA!.clips[0].englishVo = "Hello there.";
  video.phaseA!.clips[0].startScene = 'Person seated. Subtitle: one LARGE line, exactly "Hello there."';
  const prompt = buildFramePrompt(video, 1, "start");
  assert.doesNotMatch(prompt, /lettering sample/);
  const plan = frameSubmitPlan(video, 1, "start");
  assert.equal(plan.refs.includes("https://blob/look.png"), false);
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

test("talking-head clip 1 start uses object sheet and background plate; clip 2+ locks to clip 1 start without conflicting plates", () => {
  const video = project("realistic");
  video.skillSlug = "talking-head-director";
  video.aspectRatio = "9:16";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Scro",
      blueprintUrl: "https://blob/scro.png",
      prompt: "East Asian woman, early 20s",
    },
  ];
  video.objectSheetItems = [
    { name: "Living Room Sofa", notes: "fabric couch" },
    { name: "Bookshelf", notes: "wooden shelf" },
  ];
  video.objectSheetUrl = "https://blob/sheet.png";
  video.backgroundPlates = [
    {
      setId: "living_room",
      name: "Bright Home Living Room",
      notes: "daylight from side window",
      clipNumbers: [1, 2],
      url: "https://blob/bg.png",
    },
  ];
  video.phaseA!.clips[0].backgroundSetId = "living_room";
  video.phaseA!.clips[0].startScene =
    'Character: seated and centered. Set: sofa and bookshelf. Light: daylight. Camera: 24mm f/1.8 on tripod. Realism: side key light, pores, film grain, foreground mug. Subtitle: one LARGE phone-readable subtitle, exactly "Clip one."';
  video.phaseA!.clips.push({
    clipNumber: 2,
    timeRange: "5-10s",
    durationSeconds: 5,
    narrativeJob: "clip 2",
    explainerScene: "seated",
    motionCamera: "locked camera",
    englishVo: "Clip two.",
    bgmSfx: "none",
    backgroundSetId: "living_room",
    startScene:
      'Character: seated, head tilted right. Set: same sofa and bookshelf. Light: daylight. Camera: 24mm f/1.8 on tripod. Realism: side key light, pores, film grain, foreground mug. Subtitle: one LARGE phone-readable subtitle, exactly "Clip two."',
    endScene:
      'Character: seated, head tilted left. Set: same sofa and bookshelf. Light: daylight. Camera: 24mm f/1.8 on tripod. Realism: side key light, pores, film grain, foreground mug. Subtitle: one LARGE phone-readable subtitle, exactly "Clip two."',
  });
  video.frames = [
    {
      clipNumber: 1,
      position: "start",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/clip1-start.png",
    },
  ];

  const clip1 = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(clip1.refs, [
    "https://blob/scro.png",
    "https://blob/sheet.png",
    "https://blob/bg.png",
  ]);
  assert.match(clip1.prompt, /OBJECT LOCK: attached image 2/);
  assert.match(clip1.prompt, /BACKGROUND LOCK: attached image 3/);
  assert.ok(clip1.prompt.length <= FRAME_PROMPT_BUDGET, `clip 1 prompt is ${clip1.prompt.length} chars`);

  const clip2 = frameSubmitPlan(video, 2, "start");
  assert.deepEqual(clip2.refs, [
    "https://blob/clip1-start.png",
    "https://blob/scro.png",
  ]);
  assert.match(clip2.prompt, /COMPOSITION LOCK: attached image 1 is THIS CLIP'S START frame\./);
  assert.match(clip2.prompt, /ZERO-DISPLACEMENT CONTINUITY:/);
  assert.match(clip2.prompt, /resting hand position on the lap locked to the attached frame/);
  assert.doesNotMatch(clip2.prompt, /OBJECT LOCK:/);
  assert.doesNotMatch(clip2.prompt, /BACKGROUND LOCK:/);
  assert.ok(clip2.prompt.length <= FRAME_PROMPT_BUDGET, `clip 2 prompt is ${clip2.prompt.length} chars`);

  video.frames.push({
    clipNumber: 2,
    position: "start",
    prompt: "p",
    status: "completed",
    blobUrl: "https://blob/clip2-start.png",
  });
  const clip2End = frameSubmitPlan(video, 2, "end");
  assert.deepEqual(clip2End.refs, [
    "https://blob/clip2-start.png",
    "https://blob/scro.png",
  ]);
  assert.match(clip2End.prompt, /ZERO-DISPLACEMENT CONTINUITY:/);
});

test("talking-head opening photo is the first reference on clip 1's start", () => {
  const video = project();
  video.skillSlug = "talking-head-director";
  video.styleId = "realistic";
  video.startImageUrl = "https://blob/me.png";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  const start = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(start.refs, ["https://blob/me.png", "https://blob/c.png"]);
  assert.match(start.prompt, /OPENING PHOTO: attached image 1 is the user's own starting photo/);
  const end = frameSubmitPlan(video, 1, "end");
  assert.deepEqual(end.refs, ["https://blob/c.png"]);
  assert.doesNotMatch(end.prompt, /OPENING PHOTO/);
  video.skillSlug = "full-body-talking-head-director";
  assert.deepEqual(frameSubmitPlan(video, 1, "start").refs, ["https://blob/c.png"]);
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

test("a preloaded user style supplies look and omits subtitle lettering", () => {
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
  assert.doesNotMatch(prompt, /thick black marker/);
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

test("outfit change stills lock identity, the empty room, and a calm editorial hold", () => {
  const video = project();
  video.skillSlug = "outfit-change-director";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lynn",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.referenceImages = [{ id: "R1", url: "https://blob/look1.png", description: "sweater" }];
  video.phaseA!.clips[0].referenceImageIds = ["R1"];
  video.phaseA!.clips[0].startScene =
    "Character: Lynn stands calm and editorial, wearing the complete look assigned to THIS clip from its clothing reference. Set: one empty cream-white room: plain wall. Light: soft even indoor daylight. Camera: locked eye-level three-quarter, waist-up to mid-thigh, centered, same crop, same subject size, no tilt, no push, no zoom.";
  video.phaseA!.clips[0].endScene = video.phaseA!.clips[0].startScene;
  const start = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(start.refs, ["https://blob/c.png", "https://blob/look1.png"]);
  assert.match(start.prompt, /IDENTITY LOCK/);
  assert.match(start.prompt, /calm and editorial/);
  assert.match(start.prompt, /empty cream-white room/);
  assert.match(start.prompt, /START FRAME CAMERA/);
  assert.match(start.prompt, /locked eye-level three-quarter/);
  assert.doesNotMatch(start.prompt, /energetic and happy/);
  assert.doesNotMatch(start.prompt, /NEW CAMERA/);
  assert.doesNotMatch(start.prompt, /gimbal/);
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

test("surprise hook stills drop from above, zoom in, and never paint spoken subtitles", () => {
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
  assert.doesNotMatch(start.prompt, /ultra-bold ultra-condensed/);
  assert.doesNotMatch(start.prompt, /solid black rectangle/);
  assert.doesNotMatch(start.prompt, /mustard/);
  assert.doesNotMatch(start.prompt, /I spent \$0 on ads and got 37 clients/);
  assert.doesNotMatch(start.prompt, /subtitle band across the bottom/);
  const end = frameSubmitPlan(video, 1, "end");
  assert.equal(end.anchor, undefined);
  assert.match(end.prompt, /dropped down and snapped a zoom-in/);
  assert.doesNotMatch(end.prompt, /Keep the same camera/);
});

test("later surprise clips keep the previous end without painting spoken subtitles", () => {
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
    {
      clipNumber: 2,
      position: "start",
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/prev-end.png",
    },
  ];
  const end = frameSubmitPlan(video, 2, "end");
  assert.equal(end.anchor?.kind, "clip-start");
  assert.equal(end.anchor?.url, "https://blob/prev-end.png");
  assert.match(end.prompt, /COMPOSITION LOCK/);
  assert.match(end.prompt, /dropped down and snapped a zoom-in/);
  assert.doesNotMatch(end.prompt, /first client told a friend/);
  assert.doesNotMatch(end.prompt, /THIS CLIP'S CAMERA AND POSE/);
  assert.doesNotMatch(end.prompt, /HOOK CAMERA/);
  assert.doesNotMatch(end.prompt, /white band/);
  assert.doesNotMatch(end.prompt, /hand-lettered/);
});

test("paper-cutout story stills fill the frame and forbid a dark mat", () => {
  const video = project("paper-cutout");
  video.skillSlug = "story-short-director";
  video.aspectRatio = "9:16";
  video.phaseA!.aspectRatio = "9:16";
  const prompt = buildFramePrompt(video, 1, "start");
  assert.match(prompt, /Full-bleed collage/);
  assert.match(prompt, /No dark mat/);
  assert.match(prompt, /no outer torn-paper border/);
});

test("9:16 whiteboard stills rewrite middle-60%-canvas phrasing into full-bleed canvas and enforce 2D whiteboard in any style", () => {
  for (const styleId of ["doodle", "realistic"] as const) {
    const video = project(styleId);
    video.skillSlug = "cartoon-explainer-video-director";
    video.aspectRatio = "9:16";
    video.phaseA!.aspectRatio = "9:16";
    video.phaseA!.clips[0].startScene =
      "1) Character: Scro points at a chart. 2) Set: Solid white canvas in middle 60% safe zone; diagram 「STEP 1」 -> 「STEP 2」. 3) Light: even flat light. 4) Camera: medium shot.";
    const prompt = buildFramePrompt(video, 1, "start");
    assert.doesNotMatch(prompt, /canvas in middle 60% safe zone/i);
    assert.match(prompt, /full-bleed canvas \(keep foreground subjects in the middle 60% safe zone\)/);
    assert.match(prompt, /fill 100% of the 9:16 vertical frame edge-to-edge/);
    assert.match(prompt, /no (?:top or bottom )?letterbox bars/i);
    assert.match(prompt, /flat 2D whiteboard surface/);
    assert.match(prompt, /character on the whiteboard is in 2D/);
    assert.match(prompt, /concept is explained with 2D drawings/);
  }
});

test("explainer family directors never attach prop sheets or background plates even if present on the project", () => {
  for (const slug of [
    "cartoon-explainer-video-director",
    "paper-cutout-explainer-video-director",
    "listicle-director",
    "comparison-card-director",
    "tutorial-director",
    "workflow-promo-director",
  ]) {
    const video = project("realistic");
    video.skillSlug = slug;
    video.cast = [
      { characterId: new ObjectId(), versionId: new ObjectId(), name: "Scro", blueprintUrl: "https://blob/c.png", prompt: "" },
    ];
    video.objectSheetItems = [{ name: "Marker", notes: "black pen" }];
    video.objectSheetUrl = "https://blob/sheet.png";
    video.backgroundPlates = [
      {
        setId: "studio",
        name: "Studio",
        notes: "bright light",
        clipNumbers: [1, 2],
        url: "https://blob/studio-plate.png",
      },
    ];
    video.phaseA!.clips[0].backgroundSetId = "studio";
    const plan = frameSubmitPlan(video, 1, "start");
    assert.deepEqual(plan.refs, ["https://blob/c.png"], `expected ${slug} to skip lock refs`);
    assert.doesNotMatch(plan.prompt, /OBJECT LOCK/);
    assert.doesNotMatch(plan.prompt, /BACKGROUND LOCK/);
  }
});

test("stripLetterboxBars crops top and bottom solid letterbox bands back to full-bleed 9:16", async () => {
  const w = 180;
  const h = 320;
  const topBar = 52; // ~16.25%
  const bottomBar = 64; // 20%
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      if (y < topBar || y >= h - bottomBar) {
        // Solid light-grey letterbox bar
        raw[idx] = 236;
        raw[idx + 1] = 236;
        raw[idx + 2] = 236;
      } else {
        // Textured gradient inner photograph
        raw[idx] = (x * 3 + y) % 200;
        raw[idx + 1] = (x + y * 2) % 180;
        raw[idx + 2] = (x * 5) % 220;
      }
    }
  }
  const inputPng = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  const stripped = await stripLetterboxBars(inputPng);
  const { data: outData, info: outInfo } = await sharp(stripped).raw().toBuffer({ resolveWithObject: true });
  assert.equal(outInfo.width, w);
  assert.equal(outInfo.height, h);
  // Top row should now have texture rather than flat grey (spread > 36)
  let minTop = 255;
  let maxTop = 0;
  for (let x = 0; x < w; x++) {
    const idx = x * outInfo.channels;
    const v = Math.round((outData[idx] + outData[idx + 1] + outData[idx + 2]) / 3);
    if (v < minTop) minTop = v;
    if (v > maxTop) maxTop = v;
  }
  assert.ok(maxTop - minTop > 36, `Expected top row to be full-bleed textured, got spread ${maxTop - minTop}`);
});

test("multi-style director resolves per-clip styleId for frame prompts", async () => {
  const video = project();
  video.skillSlug = "style-switch-director";
  video.styleId = "doodle";
  video.styleIds = ["doodle", "pixel"];
  video.phaseA!.clipCount = 2;
  video.phaseA!.clips[0].styleId = "doodle";
  video.phaseA!.clips.push({
    clipNumber: 2,
    timeRange: "5-10s",
    durationSeconds: 5,
    narrativeJob: "Style Switch #2",
    explainerScene: "Hero jumps into pixel world",
    motionCamera: "Camera tracks hero",
    englishVo: "Same face, pixel world.",
    startScene: "Character: Hero stands ready. Set: pixel street. Light: neon. Camera: medium shot.",
    endScene: "Character: Hero smiles. Set: pixel street. Light: neon. Camera: medium shot.",
    bgmSfx: "Whoosh",
    styleId: "pixel",
  });
  const frames = await framesWithClipsReady(video, [1, 2], async () => {});
  const clip1Start = frames.find((f) => f.clipNumber === 1 && f.position === "start");
  const clip2Start = frames.find((f) => f.clipNumber === 2 && f.position === "start");
  assert.ok(clip1Start);
  assert.ok(clip2Start);
  assert.notEqual(clip1Start.prompt, clip2Start.prompt);
  assert.match(clip2Start.prompt, /pixel/i);
});

// Break this catches: an invented clip styleId is preferred over the project style,
// then collapsed to doodle, so the still leaves the attached character blueprint.
test("invented clip style follows the project style in the frame prompt", async () => {
  const video = project("realistic");
  video.skillSlug = "cartoon-explainer-video-director";
  video.phaseA!.clips[0].styleId = "cinematic-realistic";
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Scro",
      blueprintUrl: "https://blob/scro-realistic-board.png",
      prompt: "photoreal standing board",
    },
  ];
  const frames = await framesWithClipsReady(video, [1], async () => {});
  const start = frames.find((frame) => frame.clipNumber === 1 && frame.position === "start");
  assert.ok(start);
  assert.match(start.prompt, /Single storyboard still for a realistic name short video/);
  assert.match(start.prompt, /Look: realistic look/);
  assert.doesNotMatch(start.prompt, /doodle name/);
  assert.doesNotMatch(start.prompt, /doodle look/);
});



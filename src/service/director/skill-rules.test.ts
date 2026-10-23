import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookendDirectorBlock,
  bookendLocksLength,
  isBookendSkill,
  normalizeBookendClips,
  phaseADurationHint,
  briefSkillError,
  cartoonClipAction,
  cartoonExplainerDirectorBlock,
  dropRepeatedSubtitleLabels,
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
  comparisonCardDirectorBlock,
  comparisonPanels,
  comparisonSplitAxis,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  isComparisonCardSkill,
  isTalkingBrollSkill,
  listicleDirectorBlock,
  listicleListEntries,
  requiredCastCount,
  followShotDirectorBlock,
  outfitReelDirectorBlock,
  surpriseInterviewDirectorBlock,
  verticalSafeAreaDirectorLine,
  talkingBrollDirectorBlock,
  skillBansNarration,
  skillForcesSceneText,
  skillUsesOnScreenLipSync,
  storyShortCameraLock,
  storyShortDirectorBlock,
} from "@/service/director/skill-rules";

test("opening and ending are bookend skills", () => {
  assert.equal(isBookendSkill("opening-director"), true);
  assert.equal(isBookendSkill("ending-director"), true);
  assert.equal(isBookendSkill("listicle-director"), false);
});

test("auto leaves length to the director; a chosen preset keeps its clip budget", () => {
  assert.equal(bookendLocksLength("opening-director", "auto"), true);
  assert.equal(bookendLocksLength("ending-director", "full"), false);
  assert.equal(bookendLocksLength("listicle-director", "auto"), false);
  assert.match(
    phaseADurationHint({ skillSlug: "cartoon-explainer-video-director", durationPreset: "auto" }),
    /AUTO length/,
  );
  assert.match(
    phaseADurationHint({ skillSlug: "cartoon-explainer-video-director", durationPreset: "punchy" }),
    /4–6 clips/,
  );
  assert.match(
    phaseADurationHint({ skillSlug: "opening-director", durationPreset: "auto" }),
    /EXACTLY 1 clip/,
  );
  assert.match(
    phaseADurationHint({ skillSlug: "opening-director", durationPreset: "full" }),
    /7–10 clips/,
  );
  const locked = bookendDirectorBlock("opening-director", false);
  assert.match(locked, /exactly ONE clip/);
  const open = bookendDirectorBlock("opening-director", false, { lockLength: false });
  assert.doesNotMatch(open, /exactly ONE clip/);
  assert.match(open, /duration preset/);
});

test("bookend storyboards collapse to one 5–8s clip", () => {
  const row = (clipNumber: number, durationSeconds: number) => ({
    clipNumber,
    durationSeconds,
    timeRange: "x",
  });
  assert.deepEqual(normalizeBookendClips([row(1, 10), row(2, 5)]), [
    { clipNumber: 1, durationSeconds: 8, timeRange: "0–8s" },
  ]);
  assert.deepEqual(normalizeBookendClips([row(1, 1)]), [
    { clipNumber: 1, durationSeconds: 5, timeRange: "0–5s" },
  ]);
  assert.deepEqual(normalizeBookendClips([]), []);
});

test("bookend director block uses the logo only when one is attached", () => {
  assert.match(bookendDirectorBlock("opening-director", true), /logo image is attached/);
  assert.match(bookendDirectorBlock("ending-director", false), /No logo image is attached/);
  assert.match(bookendDirectorBlock("ending-director", true), /ENDING bookend/);
});

test("only talking-head and surprise-interview use on-screen lip-sync; story short and Q&A use off-screen narration with mouths closed", () => {
  assert.equal(skillUsesOnScreenLipSync("talking-head-director"), true);
  assert.equal(skillUsesOnScreenLipSync("full-body-talking-head-director"), true);
  assert.equal(skillUsesOnScreenLipSync("surprise-interview-director"), true);
  assert.equal(skillUsesOnScreenLipSync("story-short-director"), false);
  assert.equal(skillUsesOnScreenLipSync("dialogue-qa-director"), false);
  assert.equal(skillUsesOnScreenLipSync("cartoon-explainer-video-director"), false);
  assert.equal(skillUsesOnScreenLipSync("listicle-director"), false);
  assert.equal(skillUsesOnScreenLipSync("talking-broll-director"), false);

  assert.equal(skillBansNarration("surprise-interview-director"), true);
  assert.equal(skillBansNarration("story-short-director"), false);
  assert.equal(skillBansNarration("dialogue-qa-director"), false);
  assert.equal(skillBansNarration("cartoon-explainer-video-director"), false);
  assert.match(storyShortDirectorBlock(), /Do not force want/);
  assert.match(storyShortDirectorBlock(), /mouths stay closed/i);
  assert.match(storyShortDirectorBlock(), /never lip-sync/i);
});

test("story short is filmed third-person: characters never address the camera", () => {
  assert.match(storyShortDirectorBlock(), /third-person/);
  assert.match(storyShortDirectorBlock(), /never look at or talk to the camera/);
  assert.match(storyShortCameraLock("story-short-director"), /third-person observer camera/);
  assert.match(storyShortCameraLock("story-short-director"), /No eye contact with the lens/);
  assert.equal(storyShortCameraLock("cartoon-explainer-video-director"), "");
  assert.equal(storyShortCameraLock("dialogue-qa-director"), "");
});

test("a cartoon still drops a bracket label that repeats the subtitle", () => {
  const scene =
    'floating label 「5 Camera Motions You Need to Know!」 beside her. Subtitle: "5 Camera Motions You Need to Know!"';
  const next = dropRepeatedSubtitleLabels(scene);
  assert.doesNotMatch(next, /「5 Camera Motions You Need to Know!」/);
  assert.match(next, /Subtitle: "5 Camera Motions You Need to Know!"/);
});

test("a different diagram label stays next to the subtitle", () => {
  const scene = 'cue card labeled 「ARC SHOT」. Subtitle: "First is the arc shot!"';
  assert.match(dropRepeatedSubtitleLabels(scene), /「ARC SHOT」/);
});

test("whiteboard explainer is always narrated; every topic uses an explanation graph", () => {
  const block = cartoonExplainerDirectorBlock();
  assert.match(block, /ALWAYS narrated/);
  assert.match(block, /never speaks/);
  assert.match(block, /I'm Scro/);
  assert.match(block, /explanation graph/);
  assert.match(block, /every topic/);
  assert.match(block, /beat title/);
  assert.match(block, /never write Subtitle:/);
  assert.doesNotMatch(block, /STEP N|STEP 1/);
  assert.doesNotMatch(block, /at least 3 concrete props/);
  assert.doesNotMatch(block, /SYSTOLIC|TPU|walk-forward/i);
  const still = cartoonNarratorFrameLock("cartoon-explainer-video-director");
  assert.match(still, /does not talk/);
  assert.match(still, /explanation graph/);
  assert.match(still, /beat title/);
  assert.doesNotMatch(still, /STEP N|STEP 1/);
  assert.match(cartoonNarratorVideoLock("cartoon-explainer-video-director"), /off-screen narrator/);
  assert.match(cartoonNarratorVideoLock("cartoon-explainer-video-director"), /never speaks or lip-syncs/);
  assert.equal(cartoonNarratorFrameLock("story-short-director"), "");
  assert.equal(cartoonNarratorVideoLock("story-short-director"), "");
  assert.equal(skillBansNarration("cartoon-explainer-video-director"), false);

  const withCast = cartoonExplainerDirectorBlock({ hasCharacter: true });
  assert.match(withCast, /facial expression/);
  assert.match(withCast, /walk is not a new action/);
  assert.match(withCast, /left side/);
  assert.match(withCast, /right side/);
  assert.match(withCast, /jump/);
  assert.match(withCast, /pull \(bring in/);
  assert.match(withCast, /push \(send out/);
  assert.match(withCast, /point toward the camera/);
  assert.match(withCast, /last clip never points toward the camera/);
  assert.match(withCast, /not two standing poses/);
  assert.match(withCast, /head may turn/);
  assert.match(withCast, /previous two clips/);
  assert.match(withCast, /by what the clip's line means/);
  assert.match(withCast, /80%/);
  assert.match(withCast, /same side/);
  assert.match(withCast, /toward the camera/);
  assert.match(withCast, /zoom in or out/);
  assert.match(withCast, /explanation graph/);
  assert.match(withCast, /never speaks/);
  assert.doesNotMatch(withCast, /stand aside/);
  const movingStill = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
    hasCharacter: true,
  });
  assert.match(movingStill, /facial expression/);
  assert.match(movingStill, /same side/);
  assert.match(movingStill, /left or the right/);
  assert.match(movingStill, /feet off the ground/);
  assert.match(movingStill, /point toward the camera/);
  assert.match(movingStill, /not a neutral standing pose/);
  const movingVideo = cartoonNarratorVideoLock("cartoon-explainer-video-director", { hasCharacter: true });
  assert.match(movingVideo, /same side/);
  assert.match(movingVideo, /three beats/);
  assert.match(movingVideo, /snapping fast and sharp/);
  assert.match(movingVideo, /never one constant slow glide/);
  assert.doesNotMatch(movingVideo, /A smooth glide is required/);
  assert.match(movingVideo, /left to right/);
  assert.match(movingVideo, /Do not repeat/);
  assert.match(movingVideo, /walk between two standing poses/);
  assert.match(withCast, /never write that it vanished/i);
  assert.match(movingStill, /hands act on the drawn element/);
  assert.doesNotMatch(movingStill, /closer or farther/);
});

test("the clip's one action is read from motionCamera, ignoring camera moves", () => {
  assert.equal(
    cartoonClipAction(
      "0–2s: The camera pushes in. Scro leans forward and shove the large dark card forward toward the slot 「SCRO ENGINE」. 2–4s: arms extend fully.",
    ),
    "push",
  );
  assert.equal(cartoonClipAction("0–2s: She grabs the box and pulls it toward her chest."), "pull");
  assert.equal(cartoonClipAction("Camera push-in; he crouches and jumps, feet leaving the ground."), "jump");
  assert.equal(cartoonClipAction("0–2s: He raises one arm and points straight at the camera."), "point");
  assert.equal(cartoonClipAction("0–2s: Slow camera pull back over the diagram."), undefined);
  assert.equal(cartoonClipAction(undefined), undefined);
});

test("each new action is read from its listed word, without stealing neighbours", () => {
  const cases: Array<[string, string | undefined]> = [
    ["0–2s: Scro stacks a third block on the pile.", "stack"],
    ["0–2s: A tall stack of papers sits by the bin while Scro tosses the crumpled habit into it.", "toss"],
    ["0–2s: She lifts the gold bar overhead.", "lift"],
    ["0–2s: She lifts her arm and points at the camera.", "point"],
    ["0–2s: The pieces snap into place as Scro places the tile into its slot.", "place"],
    ["0–2s: He plugs the cable into the 「API」 socket.", "plug"],
    ["0–2s: Scro sketches an arrow from 「CAUSE」 to 「EFFECT」.", "sketch"],
    ["0–2s: He draws the arrow from A to B.", "sketch"],
    ["0–2s: She flips the 「MYTH」 card.", "flip"],
    ["0–2s: Scro turns the dial from low to high.", "dial"],
    ["0–2s: He pulls the timeline apart with both hands.", "stretch"],
    ["0–2s: She stretches her arms and jumps.", "jump"],
    ["0–2s: Scro squeezes the messy pile into one block.", "squeeze"],
    ["0–2s: She holds the magnifying glass over 「COST」.", "magnify"],
    ["0–2s: Camera turns around the set while Scro waits.", undefined],
  ];
  for (const [motion, expected] of cases) {
    assert.equal(cartoonClipAction(motion), expected, motion);
  }
});

test("every action has a short still line for both stills and a video line", () => {
  const actions = [
    "push", "pull", "stack", "lift", "place", "toss", "plug", "sketch",
    "flip", "dial", "stretch", "squeeze", "magnify", "jump", "point",
  ] as const;
  const generic = cartoonNarratorFrameLock("cartoon-explainer-video-director", { hasCharacter: true });
  for (const action of actions) {
    for (const position of ["start", "end"] as const) {
      const still = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
        hasCharacter: true,
        action,
        position,
      });
      assert.match(still, new RegExp(action === "dial" ? "DIAL" : action.toUpperCase()));
      assert.ok(still.length <= generic.length + 120, `${action} ${position} is ${still.length} chars`);
    }
    const video = cartoonNarratorVideoLock("cartoon-explainer-video-director", { hasCharacter: true, action });
    assert.match(video, /This clip's action is/);
  }
  const block = cartoonExplainerDirectorBlock({ hasCharacter: true });
  for (const action of actions) assert.match(block, new RegExp(`\\b${action} \\(`));
  assert.match(block, /previous two clips/);
  assert.match(block, /three beats/);
  assert.match(block, /Clip 1 opens already moving/);
  assert.match(block, /snap zoom in/);
  assert.match(block, /360 orbit/);
  assert.match(block, /overhead drop/);
  assert.match(block, /crash push/);
  assert.match(block, /dutch snap/);
  assert.match(block, /Later clips do not repeat this hook camera/);
  assert.match(cartoonExplainerDirectorBlock(), /snap zoom into the key node/);
  assert.match(
    cartoonNarratorVideoLock("cartoon-explainer-video-director", { hasCharacter: true, clipNumber: 1 }),
    /HOOK CAMERA/,
  );
  assert.doesNotMatch(
    cartoonNarratorVideoLock("cartoon-explainer-video-director", { hasCharacter: true, clipNumber: 2 }),
    /HOOK CAMERA/,
  );
  assert.match(
    cartoonNarratorFrameLock("cartoon-explainer-video-director", {
      hasCharacter: true,
      clipNumber: 1,
      position: "start",
    }),
    /HOOK CAMERA/,
  );
});

test("Cinematic realistic accelerates then decelerates; other styles keep the snap", () => {
  const smoothVideo = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "flip",
    clipNumber: 2,
    smoothMotion: true,
  });
  assert.match(smoothVideo, /accelerates through the change, then decelerates into the landing/);
  assert.match(smoothVideo, /middle of the move is sharp and quick/);
  assert.match(smoothVideo, /rotates through its edge/);
  assert.match(smoothVideo, /This clip's action is a FLIP/);
  assert.doesNotMatch(smoothVideo, /snapping fast and sharp/);
  assert.doesNotMatch(smoothVideo, /never one constant slow glide/);
  const smoothHook = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    clipNumber: 1,
    smoothMotion: true,
  });
  assert.match(smoothHook, /accelerates through the change, then decelerates into the landing/);
  assert.doesNotMatch(smoothHook, /no slow glide/);
  const doodle = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "flip",
    clipNumber: 2,
  });
  assert.match(doodle, /snapping fast and sharp/);
  assert.match(doodle, /never one constant slow glide/);
  assert.doesNotMatch(doodle, /accelerates through the change, then decelerates into the landing/);
  const block = cartoonExplainerDirectorBlock({ hasCharacter: true, smoothMotion: true });
  assert.match(block, /accelerates through the change, then decelerates into the landing/);
  assert.doesNotMatch(block, /three beats/);
  assert.doesNotMatch(block, /Never describe the body as moving smoothly/);
  assert.doesNotMatch(block, /no slow glide/);
  assert.match(cartoonExplainerDirectorBlock({ hasCharacter: true }), /three beats/);
});

test("Cinematic realistic locks the camera and forbids spoken subtitles on stills", () => {
  // Phase A: no angle change inside a clip, gentle hook only, no spoken subtitle.
  const block = cartoonExplainerDirectorBlock({ hasCharacter: true, smoothMotion: true });
  assert.match(block, /camera is locked inside a clip/);
  assert.match(block, /No orbit/);
  assert.match(block, /never write Subtitle:/);
  assert.match(block, /at most one push-in or pull-out/);
  assert.doesNotMatch(block, /Camera angle changes every clip/);
  assert.doesNotMatch(block, /fast 360 orbit/);
  const doodle = cartoonExplainerDirectorBlock({ hasCharacter: true });
  assert.match(doodle, /Camera angle changes every clip/);
  assert.match(doodle, /never write Subtitle:/);
  // Stills: the two frames of a clip share the camera.
  const still = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "flip",
    position: "end",
    clipNumber: 1,
    steadyStills: true,
  });
  assert.match(still, /match the other still of this clip/);
  assert.match(still, /one push-in or pull-out at most/);
  assert.doesNotMatch(still, /may differ from the other still/);
  assert.doesNotMatch(still, /exaggerated framing/);
  // Video: the lettering never changes and the camera stays put.
  const video = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "flip",
    clipNumber: 2,
    smoothMotion: true,
  });
  assert.match(video, /lands on the described end scene/);
  assert.match(video, /There is no end image/);
  assert.match(video, /lettering painted on the start still stays fixed/);
});

test("a detected push draws only that action, aimed away from the character", () => {
  const start = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "push",
    position: "start",
  });
  assert.match(start, /PUSH/);
  assert.match(start, /point away from the character/);
  assert.doesNotMatch(start, /jump|pull/i);
  const end = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "push",
    position: "end",
  });
  assert.match(end, /still visible, farther from the character/);
  assert.match(end, /Do not swap the action for a jump/);
  const pullEnd = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "pull",
    position: "end",
  });
  assert.match(pullEnd, /close to the body/);
  const video = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    action: "push",
  });
  assert.match(video, /shoots away from the character's body/);
  assert.doesNotMatch(video, /for the whole clip/);
});

test("Q&A and non-talking-head directors use off-screen narration and keep character mouths closed", () => {
  assert.equal(skillBansNarration("dialogue-qa-director"), false);
  assert.match(dialogueOnlyDirectorBlock(), /NO narrator/);
  assert.match(dialogueOnlyDirectorBlock(), /NAME: "line"/);
  assert.match(dialogueOnlyDirectorBlock(), /voice lock verbatim/);
  assert.match(dialogueOnlyDirectorBlock(), /keeps their mouth closed/);
  assert.match(dialogueQaDirectorBlock(), /off-screen narrator/i);
  assert.match(dialogueQaDirectorBlock(), /mouths stay closed/i);
  assert.match(dialogueQaDirectorBlock(), /never lip-sync/i);
  assert.doesNotMatch(dialogueQaDirectorBlock(), /SHORT FILM/);
});

test("Q&A director requires exactly two characters", () => {
  assert.equal(requiredCastCount("dialogue-qa-director"), 2);
  assert.equal(requiredCastCount("talking-head-director"), 1);
  assert.equal(requiredCastCount("full-body-talking-head-director"), 1);
  assert.match(briefSkillError({ skillSlug: "talking-head-director", characterIds: ["a", "b"] }) || "", /1/);
  assert.match(
    briefSkillError({ skillSlug: "full-body-talking-head-director", characterIds: [] }) || "",
    /1/,
  );
  assert.equal(briefSkillError({ skillSlug: "talking-head-director", characterIds: ["a"] }), undefined);
  assert.equal(requiredCastCount("story-short-director"), 1);
  for (const slug of [
    "cartoon-explainer-video-director",
    "product-demo-director",
    "listicle-director",
    "tutorial-director",
    "opening-director",
    "ending-director",
    "comparison-card-director",
  ]) {
    assert.equal(requiredCastCount(slug), 1);
    assert.match(briefSkillError({ skillSlug: slug, characterIds: ["a", "b"] }) || "", /1/);
    assert.equal(briefSkillError({ skillSlug: slug, characterIds: ["a"] }), undefined);
  }
  assert.match(briefSkillError({ skillSlug: "dialogue-qa-director", characterIds: [] }) || "", /2/);
  assert.equal(
    briefSkillError({ skillSlug: "dialogue-qa-director", characterIds: ["a", "b"] }),
    undefined,
  );
  assert.match(
    briefSkillError({ skillSlug: "dialogue-qa-director", characterIds: ["a"] }) || "",
    /2/,
  );
});

test("comparison card is a split, and talking-head b-roll needs one face", () => {
  assert.equal(isComparisonCardSkill("comparison-card-director"), true);
  assert.equal(comparisonSplitAxis("16:9"), "left-right");
  assert.equal(comparisonSplitAxis("9:16"), "top-bottom");
  assert.deepEqual(comparisonPanels("contrast: What you see | What your baby sees"), {
    a: "What you see",
    b: "What your baby sees",
  });
  assert.equal(comparisonPanels("hook"), null);
  assert.match(comparisonCardDirectorBlock("9:16"), /TOP half/);
  assert.match(comparisonCardDirectorBlock("16:9"), /LEFT half/);
  assert.equal(isTalkingBrollSkill("talking-broll-director"), true);
  assert.equal(requiredCastCount("talking-broll-director"), 1);
  assert.match(talkingBrollDirectorBlock(), /two on-camera lines/);
  assert.match(talkingBrollDirectorBlock(), /Override clip inheritance/);
});

test("surprise, outfit, and follow each need one character", () => {
  for (const slug of ["surprise-interview-director", "outfit-reel-director", "follow-shot-director"]) {
    assert.equal(requiredCastCount(slug), 1);
    assert.match(briefSkillError({ skillSlug: slug, characterIds: [] }) || "", /1/);
    assert.equal(briefSkillError({ skillSlug: slug, characterIds: ["a"] }), undefined);
  }
  assert.match(surpriseInterviewDirectorBlock(), /startScene copies the previous endScene/);
  assert.match(surpriseInterviewDirectorBlock(), /Do not hard-cut to a new angle/);
  assert.match(surpriseInterviewDirectorBlock(), /right-side up/);
  assert.match(surpriseInterviewDirectorBlock(), /drops downward/);
  assert.match(surpriseInterviewDirectorBlock(), /zoom-in/);
  assert.match(surpriseInterviewDirectorBlock(), /selected text style/);
  assert.doesNotMatch(surpriseInterviewDirectorBlock(), /dry-brush/);
  assert.match(surpriseInterviewDirectorBlock(), /top, middle, or bottom/);
  assert.match(outfitReelDirectorBlock(), /already fully dressed/);
  assert.match(outfitReelDirectorBlock(), /Only the clothes change/);
  assert.match(outfitReelDirectorBlock(), /energetic and happy/);
  assert.match(outfitReelDirectorBlock(), /100 percent/);
  assert.match(outfitReelDirectorBlock(), /left to right/);
  assert.match(outfitReelDirectorBlock(), /top to bottom/);
  assert.match(outfitReelDirectorBlock(), /shuffle/);
  assert.match(outfitReelDirectorBlock(), /\(no dialogue\)/);
  assert.match(outfitReelDirectorBlock(), /No background music/);
  assert.match(outfitReelDirectorBlock(), /slow gimbal/);
  assert.match(outfitReelDirectorBlock(), /no handheld shake/);
  assert.doesNotMatch(outfitReelDirectorBlock(), /one garment/);
  assert.doesNotMatch(outfitReelDirectorBlock(), /tight shorts/);
  assert.doesNotMatch(outfitReelDirectorBlock(), /startScene copies the previous endScene/);
  assert.match(followShotDirectorBlock(), /startScene copies the previous endScene/);
  assert.match(followShotDirectorBlock(), /Do not scroll a whole street/);
});

test("listicle forces on-canvas listing text", () => {
  const block = listicleDirectorBlock();
  assert.match(block, /one by one/);
  assert.match(block, /full list/);
  assert.match(block, /Never more than 3/);
  assert.match(block, /largest text/);
  assert.match(block, /different camera angle/);
  assert.equal(skillForcesSceneText("listicle-director"), true);
  assert.equal(skillForcesSceneText("tutorial-director"), false);
  const entries = listicleListEntries([
    { clipNumber: 1, narrativeJob: "hook", englishVo: "Three morning mistakes." },
    { clipNumber: 2, narrativeJob: "item 1 of 3", englishVo: "Snooze the alarm." },
    { clipNumber: 3, narrativeJob: "item 2 of 3", englishVo: "Skip water." },
    { clipNumber: 4, narrativeJob: "outro", englishVo: "Fix one today." },
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.title),
    ["Snooze the alarm.", "Skip water."],
  );
});

test("every director keeps a 9:16 middle safe area and leaves landscape alone", () => {
  const vertical = verticalSafeAreaDirectorLine("9:16");
  assert.match(vertical, /full-bleed/i);
  assert.match(vertical, /fills 100% of the 9:16 frame edge-to-edge/);
  assert.match(vertical, /top 20%/);
  assert.match(vertical, /bottom 20%/);
  assert.match(vertical, /middle 60%/);
  assert.match(vertical, /text, characters, or the main subject/);
  assert.equal(verticalSafeAreaDirectorLine("16:9"), "");
  assert.equal(verticalSafeAreaDirectorLine("1:1"), "");
});

test("whiteboard concept explainer enforces full-canvas 2D whiteboard, 2D character, and drawn concept in every style", () => {
  for (const smoothMotion of [false, true]) {
    for (const hasCharacter of [false, true]) {
      const directorBlock = cartoonExplainerDirectorBlock({ hasCharacter, smoothMotion });
      assert.match(directorBlock, /flat 2D whiteboard surface/);
      assert.match(directorBlock, /drawn in flat 2D directly on the whiteboard/);
      assert.match(directorBlock, /explained with 2D drawings/);
    }
  }
  for (const steadyStills of [false, true]) {
    for (const hasCharacter of [false, true]) {
      const frameLock = cartoonNarratorFrameLock("cartoon-explainer-video-director", {
        hasCharacter,
        steadyStills,
      });
      assert.match(frameLock, /flat 2D whiteboard surface/);
      assert.match(frameLock, /character on the whiteboard is in 2D/);
      assert.match(frameLock, /concept is explained with 2D drawings/);
    }
  }
  const videoLock = cartoonNarratorVideoLock("cartoon-explainer-video-director", {
    hasCharacter: true,
    smoothMotion: true,
  });
  assert.match(videoLock, /flat 2D whiteboard surface/);
  assert.match(videoLock, /character in 2D on the whiteboard/);
  assert.match(videoLock, /concept explained with 2D whiteboard drawings/);
});

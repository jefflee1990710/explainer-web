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
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
  comparisonCardDirectorBlock,
  comparisonPanels,
  comparisonSplitAxis,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  isComparisonCardSkill,
  isTalkingBrollSkill,
  listicleListEntries,
  requiredCastCount,
  followShotDirectorBlock,
  outfitReelDirectorBlock,
  surpriseInterviewDirectorBlock,
  talkingBrollDirectorBlock,
  skillBansNarration,
  skillForcesSceneText,
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

test("bookend storyboards collapse to one 3–4s clip", () => {
  const row = (clipNumber: number, durationSeconds: number) => ({
    clipNumber,
    durationSeconds,
    timeRange: "x",
  });
  assert.deepEqual(normalizeBookendClips([row(1, 6), row(2, 5)]), [
    { clipNumber: 1, durationSeconds: 4, timeRange: "0–4s" },
  ]);
  assert.deepEqual(normalizeBookendClips([row(1, 1)]), [
    { clipNumber: 1, durationSeconds: 3, timeRange: "0–3s" },
  ]);
  assert.deepEqual(normalizeBookendClips([]), []);
});

test("bookend director block uses the logo only when one is attached", () => {
  assert.match(bookendDirectorBlock("opening-director", true), /logo image is attached/);
  assert.match(bookendDirectorBlock("ending-director", false), /No logo image is attached/);
  assert.match(bookendDirectorBlock("ending-director", true), /ENDING bookend/);
});

test("story short is a no-narrator short film", () => {
  assert.equal(skillBansNarration("story-short-director"), true);
  assert.equal(skillBansNarration("cartoon-explainer-video-director"), false);
  assert.match(storyShortDirectorBlock(), /Do not force want/);
});

test("story short is filmed third-person: characters never address the camera", () => {
  assert.match(storyShortDirectorBlock(), /third-person/);
  assert.match(storyShortDirectorBlock(), /never look at or talk to the camera/);
  assert.match(storyShortCameraLock("story-short-director"), /third-person observer camera/);
  assert.match(storyShortCameraLock("story-short-director"), /No eye contact with the lens/);
  assert.equal(storyShortCameraLock("cartoon-explainer-video-director"), "");
  assert.equal(storyShortCameraLock("dialogue-qa-director"), "");
});

test("whiteboard explainer is always narrated; every topic uses an explanation graph", () => {
  const block = cartoonExplainerDirectorBlock();
  assert.match(block, /ALWAYS narrated/);
  assert.match(block, /never speaks/);
  assert.match(block, /I'm Scro/);
  assert.match(block, /explanation graph/);
  assert.match(block, /every topic/);
  assert.match(block, /beat title/);
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

test("Q&A is dialogue-only like story short: no narrator, character lines", () => {
  assert.equal(skillBansNarration("dialogue-qa-director"), true);
  assert.match(dialogueOnlyDirectorBlock(), /NO narrator/);
  assert.match(dialogueOnlyDirectorBlock(), /NAME: "line"/);
  assert.match(dialogueOnlyDirectorBlock(), /voice lock verbatim/);
  assert.match(dialogueOnlyDirectorBlock(), /keeps their mouth closed/);
  assert.match(dialogueQaDirectorBlock(), /ASKER/);
  assert.match(dialogueQaDirectorBlock(), /mouth stays closed/);
  assert.doesNotMatch(dialogueQaDirectorBlock(), /SHORT FILM/);
});

test("Q&A director requires exactly two characters", () => {
  assert.equal(requiredCastCount("dialogue-qa-director"), 2);
  assert.equal(requiredCastCount("talking-head-director"), 1);
  assert.equal(requiredCastCount("full-body-talking-head-director"), 1);
  assert.equal(requiredCastCount("story-short-director"), 0);
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
  assert.match(surpriseInterviewDirectorBlock(), /different camera angle/);
  assert.match(surpriseInterviewDirectorBlock(), /different body pose/);
  assert.match(surpriseInterviewDirectorBlock(), /right-side up/);
  assert.match(surpriseInterviewDirectorBlock(), /drops downward/);
  assert.match(surpriseInterviewDirectorBlock(), /zoom-in/);
  assert.match(surpriseInterviewDirectorBlock(), /dry-brush/);
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

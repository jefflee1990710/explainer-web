import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookendDirectorBlock,
  bookendLocksLength,
  isBookendSkill,
  normalizeBookendClips,
  phaseADurationHint,
  briefSkillError,
  cartoonExplainerDirectorBlock,
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  listicleListEntries,
  requiredCastCount,
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

test("whiteboard explainer is always narrated; the character silently explains with props", () => {
  const block = cartoonExplainerDirectorBlock();
  assert.match(block, /ALWAYS narrated/);
  assert.match(block, /never speaks/);
  assert.match(block, /I'm Scro/);
  assert.match(block, /at least 3 concrete props/);
  const still = cartoonNarratorFrameLock("cartoon-explainer-video-director");
  assert.match(still, /does not talk/);
  assert.match(still, /every prop named in the Scene/);
  assert.match(cartoonNarratorVideoLock("cartoon-explainer-video-director"), /off-screen narrator/);
  assert.match(cartoonNarratorVideoLock("cartoon-explainer-video-director"), /never speaks or lip-syncs/);
  assert.equal(cartoonNarratorFrameLock("story-short-director"), "");
  assert.equal(cartoonNarratorVideoLock("story-short-director"), "");
  assert.equal(skillBansNarration("cartoon-explainer-video-director"), false);
});

test("Q&A is dialogue-only like story short: no narrator, character lines", () => {
  assert.equal(skillBansNarration("dialogue-qa-director"), true);
  assert.match(dialogueOnlyDirectorBlock(), /NO narrator/);
  assert.match(dialogueOnlyDirectorBlock(), /NAME: "line"/);
  assert.match(dialogueQaDirectorBlock(), /ASKER/);
  assert.doesNotMatch(dialogueQaDirectorBlock(), /SHORT FILM/);
});

test("Q&A director requires exactly two characters", () => {
  assert.equal(requiredCastCount("dialogue-qa-director"), 2);
  assert.equal(requiredCastCount("talking-head-director"), 1);
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

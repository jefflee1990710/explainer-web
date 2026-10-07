import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIALOGUE_SPEAK_LOCK,
  lockDialogueSpeech,
  narratorSpeechLock,
  spokenLineCopy,
  subtitleText,
} from "@/service/director/spoken-line";

test("story-short field copy says 對白, not 旁白", () => {
  const copy = spokenLineCopy("story-short-director");
  assert.equal(copy.section, "對白");
  assert.equal(copy.field("English"), "對白（English）");
  assert.match(copy.placeholder, /角色/);
  assert.doesNotMatch(copy.section, /旁白/);
  assert.doesNotMatch(copy.emptyError, /旁白/);
});

test("explainer field copy stays 旁白", () => {
  const copy = spokenLineCopy("cartoon-explainer-video-director");
  assert.equal(copy.section, "旁白");
  assert.equal(copy.field("English"), "旁白（English）");
  assert.match(copy.emptyError, /旁白/);
});

test("lockDialogueSpeech makes story-short video prompts require on-screen speech", () => {
  const locked = lockDialogueSpeech("Walk toward the box.", "story-short-director");
  assert.match(locked, /Walk toward the box/);
  assert.match(locked, /visible mouth/);
  assert.match(locked, /No off-screen narrator/);
  assert.equal(lockDialogueSpeech(locked, "story-short-director"), locked);
});

test("story-short video prompts speak to each other, not to the camera", () => {
  const locked = lockDialogueSpeech("Two friends chat.", "story-short-director");
  assert.match(locked, /third-person observer camera/);
  assert.equal(lockDialogueSpeech(locked, "story-short-director"), locked);
  assert.doesNotMatch(
    lockDialogueSpeech("Asker asks.", "dialogue-qa-director"),
    /third-person observer camera/,
  );
});

test("subtitleText drops speaker names and quotes from dialogue lines", () => {
  assert.equal(
    subtitleText('Scro - Cinematic: "One clone, unlimited environments."'),
    "One clone, unlimited environments.",
  );
  assert.equal(subtitleText('阿明：「你來了。」 Mary: "Finally!"'), "你來了。 Finally!");
  assert.equal(subtitleText("(no dialogue)"), "");
  assert.equal(subtitleText("Plain line, no speaker."), "Plain line, no speaker.");
});

test("lockDialogueSpeech leaves explainer prompts unchanged until a spoken line is supplied", () => {
  assert.equal(
    lockDialogueSpeech("Narrator reads the line.", "cartoon-explainer-video-director"),
    "Narrator reads the line.",
  );
  assert.equal(
    lockDialogueSpeech("She puts on the skirt.", "outfit-reel-director"),
    "She puts on the skirt.",
  );
});

test("cartoon explainer puts the narrator line first so the clip cannot stay silent", () => {
  const line = "Boosting cannot revive a dead post.";
  const locked = lockDialogueSpeech("Animate the magnifier.", "cartoon-explainer-video-director", line);
  assert.match(locked, /^AUDIO REQUIRED/);
  assert.match(locked, /Boosting cannot revive a dead post/);
  assert.match(locked, /never silent/);
  assert.match(locked, /mouth stays closed/);
  assert.match(locked, /Sound effects never replace this voice/);
  assert.equal(lockDialogueSpeech(locked, "cartoon-explainer-video-director", line), locked);
  assert.equal(
    lockDialogueSpeech("Animate.", "cartoon-explainer-video-director", "(no dialogue)"),
    "Animate.",
  );
  assert.equal(narratorSpeechLock("(no dialogue)"), "");
});

test("lockDialogueSpeech adds lip-sync rules for talking-head directors only", () => {
  const locked = lockDialogueSpeech("She reads the line.", "full-body-talking-head-director");
  assert.match(locked, /visible mouth/);
  assert.match(locked, /lip-sync/);
  assert.match(locked, /chest height/);
  assert.equal(lockDialogueSpeech(locked, "full-body-talking-head-director"), locked);
});

test("DIALOGUE_SPEAK_LOCK tells MiniMax the on-screen character speaks", () => {
  assert.match(DIALOGUE_SPEAK_LOCK, /On-screen characters MUST speak/);
  assert.match(DIALOGUE_SPEAK_LOCK, /visible mouth/);
});

test("dialogue video prompts name the speaking mouth and keep the listener shut", () => {
  const line = 'Joyce: "What\'s the best marketing tool right now?"';
  const locked = lockDialogueSpeech("They sit at a table.", "dialogue-qa-director", line, [
    "Joyce",
    "Scro Official",
  ]);
  assert.match(locked, /Joyce's mouth lip-syncs every syllable/);
  assert.match(locked, /Scro Official's mouth stays closed/);
  assert.doesNotMatch(locked, /third-person observer camera/);
  assert.equal(
    lockDialogueSpeech(locked, "dialogue-qa-director", line, ["Joyce", "Scro Official"]),
    locked,
  );
});

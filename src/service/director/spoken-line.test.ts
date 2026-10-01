import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIALOGUE_SPEAK_LOCK,
  lockDialogueSpeech,
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

test("lockDialogueSpeech leaves explainer prompts unchanged", () => {
  assert.equal(
    lockDialogueSpeech("Narrator reads the line.", "cartoon-explainer-video-director"),
    "Narrator reads the line.",
  );
});

test("DIALOGUE_SPEAK_LOCK tells MiniMax the on-screen character speaks", () => {
  assert.match(DIALOGUE_SPEAK_LOCK, /On-screen characters MUST speak/);
  assert.match(DIALOGUE_SPEAK_LOCK, /visible mouth/);
});

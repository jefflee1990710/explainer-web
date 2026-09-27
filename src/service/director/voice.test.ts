import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_VOICE_GENDER,
  NO_BGM_RULE,
  finalizePhaseBPrompt,
  isVoiceGender,
  phaseAAudioHint,
  phaseBAudioLock,
  resolveVoiceGender,
} from "@/service/director/voice";

test("voice gender accepts male and female only", () => {
  assert.equal(isVoiceGender("male"), true);
  assert.equal(isVoiceGender("female"), true);
  assert.equal(isVoiceGender("man"), false);
  assert.equal(resolveVoiceGender(undefined), DEFAULT_VOICE_GENDER);
  assert.equal(resolveVoiceGender("female"), "female");
});

test("Phase A audio hint locks the chosen narrator voice and forbids BGM", () => {
  assert.match(phaseAAudioHint("female"), /adult female voice/);
  assert.match(phaseAAudioHint("female"), /Never switch to a male voice/);
  assert.match(phaseAAudioHint("male"), /adult male voice/);
  assert.match(phaseAAudioHint("male"), /no background music/i);
  assert.match(phaseAAudioHint("male"), /bgmDirection/);
});

test("story-short Phase A audio hint skips narrator gender", () => {
  const hint = phaseAAudioHint("male", { bansNarration: true });
  assert.match(hint, /No narrator/);
  assert.match(hint, /when the clip video is generated/i);
  assert.doesNotMatch(hint, /adult male voice/);
  assert.match(hint, /no background music/i);
});

test("Phase B audio lock names the voice and forbids background music", () => {
  const lock = phaseBAudioLock({
    voiceGender: "female",
    languageLabel: "English",
  });
  assert.match(lock, /adult female voice speaking English/);
  assert.match(lock, /mid pitch/);
  assert.match(lock, /same narrator on every clip/i);
  assert.match(lock, /No background music/);
  assert.match(lock, /no BGM/i);
  assert.match(lock, /no musical score/i);
});

test("Phase B audio lock is a fixed fingerprint, not rewritten per clip", () => {
  const a = phaseBAudioLock({ voiceGender: "male", languageLabel: "English" });
  const b = phaseBAudioLock({ voiceGender: "male", languageLabel: "English" });
  assert.equal(a, b);
  assert.match(a, /mid-low pitch/);
  assert.match(a, /same narrator on every clip/i);
  const female = phaseBAudioLock({ voiceGender: "female", languageLabel: "日本語" });
  assert.match(female, /speaking 日本語/);
  assert.notEqual(a, female);
});

test("story-short Phase B lock infers each speaker and still forbids BGM", () => {
  const lock = phaseBAudioLock({
    voiceGender: "male",
    languageLabel: "English",
    bansNarration: true,
  });
  assert.match(lock, /There is no narrator/);
  assert.match(lock, /start\/end frames/);
  assert.doesNotMatch(lock, /adult male/);
  assert.doesNotMatch(lock, /mid-low pitch/);
  assert.match(lock, /No background music/);
});

test("finalizePhaseBPrompt appends the audio lock once", () => {
  const lock = phaseBAudioLock({ voiceGender: "male", languageLabel: "English" });
  const once = finalizePhaseBPrompt("Walk toward the box.", lock);
  assert.match(once, /Walk toward the box/);
  assert.match(once, /adult male voice/);
  assert.match(once, /No background music/);
  const twice = finalizePhaseBPrompt(once, lock);
  assert.equal(twice.split(NO_BGM_RULE).length - 1, 1);
});

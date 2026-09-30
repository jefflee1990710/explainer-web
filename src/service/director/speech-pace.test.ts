import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SPEECH_PACE,
  isSpeechPace,
  resolveSpeechPace,
  speechPaceDelivery,
  speechPaceSkillHint,
} from "@/service/director/speech-pace";
import { phaseBAudioLock } from "@/service/director/voice";

test("speech pace accepts slow / medium / fast and defaults to medium", () => {
  assert.equal(isSpeechPace("slow"), true);
  assert.equal(isSpeechPace("medium"), true);
  assert.equal(isSpeechPace("fast"), true);
  assert.equal(isSpeechPace("turbo"), false);
  assert.equal(DEFAULT_SPEECH_PACE, "medium");
  assert.equal(resolveSpeechPace(undefined), "medium");
  assert.equal(resolveSpeechPace("fast"), "fast");
});

test("Phase A hint scales the spoken-word budget by pace", () => {
  assert.match(speechPaceSkillHint("slow"), /0\.8/);
  assert.match(speechPaceSkillHint("slow"), /every clip/i);
  assert.match(speechPaceSkillHint("medium"), /as written/i);
  assert.match(speechPaceSkillHint("fast"), /1\.2/);
});

test("Phase B lock carries the chosen delivery pace for narrator and dialogue", () => {
  const slow = phaseBAudioLock({ voiceGender: "male", languageLabel: "English", speechPace: "slow" });
  assert.match(slow, new RegExp(speechPaceDelivery("slow")));
  assert.doesNotMatch(slow, /moderate pace/);

  const fast = phaseBAudioLock({
    voiceGender: "male",
    languageLabel: "English",
    bansNarration: true,
    speechPace: "fast",
  });
  assert.match(fast, /There is no narrator/);
  assert.match(fast, new RegExp(speechPaceDelivery("fast")));

  const legacy = phaseBAudioLock({ voiceGender: "male", languageLabel: "English" });
  assert.match(legacy, new RegExp(speechPaceDelivery("medium")));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCharacterVoice } from "@/model/character-voice";
import {
  characterVoiceFingerprint,
  dialogueVoiceLock,
  lockedSpeakerLines,
} from "@/service/director/character-voice";
import { phaseAAudioHint, phaseBAudioLock } from "@/service/director/voice";

const fred = {
  name: "Fred",
  voice: {
    gender: "male" as const,
    age: "adult" as const,
    pitch: "mid-low" as const,
    resonance: "chesty" as const,
    texture: "warm" as const,
  },
};

const amy = {
  name: "Amy",
  voice: {
    gender: "female" as const,
    age: "young-adult" as const,
    pitch: "mid-high" as const,
    resonance: "bright" as const,
    texture: "crisp" as const,
    weight: "light" as const,
  },
};

test("a null extra note still counts as a voice lock", () => {
  const parsed = parseCharacterVoice({ ...fred.voice, weight: "medium", note: null });
  assert.equal(parsed?.gender, "male");
  assert.equal(parsed?.note, undefined);
});

test("a character voice fingerprint stays one short line", () => {
  const line = characterVoiceFingerprint("Fred", fred.voice);
  assert.equal(line, "Fred: adult male, mid-low, chesty, warm, medium.");
  assert.ok(line.length < 70);
  assert.doesNotMatch(line, /pace|excited|celebrity|never switch/i);
  const noted = characterVoiceFingerprint("Fred", { ...fred.voice, note: "  slight HK accent  " });
  assert.equal(noted, "Fred: adult male, mid-low, chesty, warm, medium, slight HK accent.");
  const long = "x".repeat(80);
  assert.ok(!characterVoiceFingerprint("Fred", { ...fred.voice, note: long }).includes("x".repeat(51)));
});

test("dialogue lock pastes every locked speaker and locks the rest to the project voice", () => {
  const lock = dialogueVoiceLock([fred, { name: "Sam" }]);
  assert.ok(lock);
  assert.match(lock, /Copy each voice lock verbatim/);
  assert.match(lock, /Fred: adult male, mid-low, chesty, warm, medium/);
  assert.match(lock, /Unlocked \(Sam\)/);
  assert.match(lock, /voice lock verbatim/);
  assert.doesNotMatch(lock, /match the frames/);
  assert.equal(lock.split("Change only emotion or volume").length - 1, 1);
  assert.deepEqual(lockedSpeakerLines([fred, { name: "Sam" }]), [
    characterVoiceFingerprint("Fred", fred.voice),
  ]);
});

test("two locked speakers stay distinct and identical across calls", () => {
  const a = dialogueVoiceLock([fred, amy]);
  const b = dialogueVoiceLock([fred, amy]);
  assert.equal(a, b);
  assert.match(a || "", /Amy: young adult female, mid-high, bright, crisp, light/);
  assert.doesNotMatch(a || "", /Speakers without a lock/);
});

test("Phase A and Phase B paste the same speaker lock for dialogue", () => {
  const speakers = [fred, amy];
  const phaseA = phaseAAudioHint("male", { bansNarration: true, speakers });
  const phaseB = phaseBAudioLock({
    voiceGender: "male",
    languageLabel: "English",
    bansNarration: true,
    speakers,
  });
  assert.match(phaseA, /Fred: adult male, mid-low, chesty, warm, medium/);
  assert.match(phaseB, /Fred: adult male, mid-low, chesty, warm, medium/);
  assert.match(phaseB, /Amy: young adult female/);
  assert.doesNotMatch(phaseB, /adult male voice speaking/);
  assert.match(phaseB, /On-screen characters MUST speak/);
  assert.match(phaseA, /no background music/i);
});

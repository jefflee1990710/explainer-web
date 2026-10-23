import assert from "node:assert/strict";
import { test } from "node:test";
import { VOICE_SAMPLE_LANGUAGES } from "@/model/character-voice-sample";
import { VO_LANGUAGE_IDS } from "@/model/project";
import { LANGUAGE_IDS, LANGUAGE_PRESETS, sceneDescriptionLanguageLock, sceneStateLabels } from "@/service/director/languages";

test("Phase A planning language follows each voiceover preset and matches demo voice languages", () => {
  assert.match(LANGUAGE_PRESETS.en.planningSkillHint, /clear English/);
  assert.match(LANGUAGE_PRESETS.en.planningSkillHint, /startScene/);
  assert.match(LANGUAGE_PRESETS.zh.planningSkillHint, /Traditional Chinese/);
  assert.match(LANGUAGE_PRESETS.yue.planningSkillHint, /Cantonese colloquial/);
  assert.match(LANGUAGE_PRESETS.ja.skillHint, /Japanese/);
  assert.match(LANGUAGE_PRESETS.ko.skillHint, /Korean/);
  assert.match(sceneDescriptionLanguageLock("en"), /clear English/);
  assert.match(sceneDescriptionLanguageLock("zh"), /Traditional Chinese/);
  assert.equal(sceneStateLabels("en").start, "Start");
  assert.equal(sceneStateLabels("ja").start, "Start");
  assert.equal(sceneStateLabels("zh").start, "起始");
  assert.equal(sceneStateLabels("yue").start, "起始");
  assert.deepEqual([...LANGUAGE_IDS].sort(), [...VO_LANGUAGE_IDS].sort());
  assert.deepEqual([...VOICE_SAMPLE_LANGUAGES].sort(), [...VO_LANGUAGE_IDS].sort());
});

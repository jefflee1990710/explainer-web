import assert from "node:assert/strict";
import { test } from "node:test";
import { LANGUAGE_PRESETS } from "@/service/director/languages";

test("Phase A planning language follows each voiceover preset", () => {
  assert.match(LANGUAGE_PRESETS.en.planningSkillHint, /clear English/);
  assert.match(LANGUAGE_PRESETS.zh.planningSkillHint, /Traditional Chinese/);
  assert.match(LANGUAGE_PRESETS.yue.planningSkillHint, /Cantonese colloquial/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSceneTextLanguage,
  resolveSceneText,
  sceneTextFrameLines,
  sceneTextSkillHint,
} from "./scene-text";

test("resolveSceneText defaults to closed; only explicit true enables", () => {
  assert.deepEqual(resolveSceneText({}), { enabled: false, language: "en" });
  assert.deepEqual(resolveSceneText({ sceneTextEnabled: false, sceneTextLanguage: "zh-Hant" }), {
    enabled: false,
    language: "zh-Hant",
  });
  assert.deepEqual(resolveSceneText({ sceneTextEnabled: true, sceneTextLanguage: "zh-Hans" }), {
    enabled: true,
    language: "zh-Hans",
  });
});

test("isSceneTextLanguage accepts only the three scene-text ids", () => {
  assert.equal(isSceneTextLanguage("en"), true);
  assert.equal(isSceneTextLanguage("zh-Hant"), true);
  assert.equal(isSceneTextLanguage("zh-Hans"), true);
  assert.equal(isSceneTextLanguage("zh"), false);
  assert.equal(isSceneTextLanguage("yue"), false);
});

test("sceneTextSkillHint and frame lines ban writing when off", () => {
  assert.match(sceneTextSkillHint(false, "en"), /On-canvas text is OFF/);
  assert.match(sceneTextFrameLines(false, "en")[0], /No on-canvas text/);
  assert.match(sceneTextFrameLines(true, "zh-Hans")[0], /Simplified Chinese/);
});

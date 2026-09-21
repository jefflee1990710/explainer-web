import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSceneTextLanguage,
  resolveSceneText,
  sceneTextFrameLines,
  sceneTextNegativePrompt,
  sceneTextDirectorRevisionNote,
  sceneTextSkillHint,
  stripStoryboardWriting,
  voiceoverLineLooksLatin,
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
  assert.match(sceneTextFrameLines(false, "en")[1], /Ignore any mention/);
});

test("enabled scene text quotes the clip narration on canvas", () => {
  const lines = sceneTextFrameLines(true, "zh-Hans", "你好世界");
  assert.match(lines.join("\n"), /subtitles ON/i);
  assert.match(lines.join("\n"), /你好世界/);
  assert.match(lines.join("\n"), /Mental Health/);
  assert.match(sceneTextSkillHint(true, "en"), /englishVo voiceover line/);
});

test("sceneTextNegativePrompt only when off", () => {
  assert.equal(sceneTextNegativePrompt(false)?.includes("subtitles"), true);
  assert.equal(sceneTextNegativePrompt(true), undefined);
});

test("stripStoryboardWriting removes embedded label quotes", () => {
  const raw =
    "Lily 靜立，右上方浮現細緻深褐色墨水手寫字「Mental Health?」。隨著水彩擴散";
  const stripped = stripStoryboardWriting(raw);
  assert.doesNotMatch(stripped, /Mental Health/);
  assert.match(stripped, /Lily/);
});

test("voiceoverLineLooksLatin detects English narration", () => {
  assert.equal(voiceoverLineLooksLatin("Hello world"), true);
  assert.equal(voiceoverLineLooksLatin("你好"), false);
});

test("director revision note asks to drop invented labels when toggling", () => {
  assert.match(sceneTextDirectorRevisionNote(true, "en"), /englishVo/);
  assert.match(sceneTextDirectorRevisionNote(false, "en"), /OFF/);
  assert.match(sceneTextSkillHint(true, "en"), /do NOT invent extra titles/i);
});

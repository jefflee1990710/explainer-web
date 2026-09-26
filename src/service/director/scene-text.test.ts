import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSceneTextLanguage,
  listicleOnCanvasLines,
  resolveSceneText,
  sceneTextFrameLines,
  sceneTextNegativePrompt,
  sceneTextDirectorRevisionNote,
  sceneTextSkillHint,
  stripStoryboardWriting,
  stripVisualWorldTextPolicy,
  voiceoverLineLooksLatin,
} from "@/service/director/scene-text";

test("resolveSceneText is always on; legacy false and missing still enable", () => {
  assert.deepEqual(resolveSceneText({}), {
    enabled: true,
    language: "en",
    inWorldLabels: false,
  });
  assert.deepEqual(resolveSceneText({ sceneTextEnabled: false, sceneTextLanguage: "zh-Hant" }), {
    enabled: true,
    language: "zh-Hant",
    inWorldLabels: false,
  });
  assert.deepEqual(resolveSceneText({ sceneTextEnabled: true, sceneTextLanguage: "zh-Hans" }), {
    enabled: true,
    language: "zh-Hans",
    inWorldLabels: false,
  });
});

test("listicle forces on-canvas text even when the toggle is off", () => {
  assert.equal(
    resolveSceneText({
      skillSlug: "listicle-director",
      sceneTextEnabled: false,
      sceneTextLanguage: "en",
    }).enabled,
    true,
  );
});

test("listicle on-canvas lines list every item and highlight the current one", () => {
  const lines = listicleOnCanvasLines({
    clips: [
      { clipNumber: 1, narrativeJob: "hook", englishVo: "Three morning mistakes." },
      { clipNumber: 2, narrativeJob: "item 1 of 3", englishVo: "Snooze the alarm." },
      { clipNumber: 3, narrativeJob: "item 2 of 3", englishVo: "Skip water." },
    ],
    clipNumber: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /numbered list/i);
  assert.match(text, /Snooze the alarm/);
  assert.match(text, /Skip water/);
  assert.match(text, /Highlight list item 1/);
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

test("whiteboard explainer legacy captions-off videos now resolve to on-canvas text", () => {
  const resolved = resolveSceneText({
    sceneTextEnabled: false,
    skillSlug: "cartoon-explainer-video-director",
  });
  assert.equal(resolved.enabled, true);
  assert.equal(resolved.inWorldLabels, false);
});

test("in-world label helpers still describe the captions-off wording", () => {
  const hint = sceneTextSkillHint(false, "en", { dualBeat: true, inWorldLabels: true });
  assert.match(hint, /captions are OFF/);
  assert.match(hint, /yellow tags/);
  assert.match(hint, /「」/);
  assert.doesNotMatch(hint, /NO written words/);

  const lines = sceneTextFrameLines(false, "en", undefined, "Lettering: marker.", {
    inWorldLabels: true,
  }).join("\n");
  assert.match(lines, /captions OFF/);
  assert.match(lines, /ARE allowed/);
  assert.match(lines, /Lettering: marker\./);
  assert.doesNotMatch(lines, /No on-canvas text/);

  assert.match(sceneTextNegativePrompt(false, true) || "", /subtitles/);
  assert.doesNotMatch(sceneTextNegativePrompt(false, true) || "", /\blabels\b/);
});

test("stripVisualWorldTextPolicy drops text-policy sentences and keeps the look", () => {
  const raw =
    "白板塗鴉風格。純白乾淨背景，黑色粗墨水手繪輪廓線條。無任何畫布文字、無任何標籤符號、無任何印刷字體或字幕，完全純靠手繪圖案傳達意象。";
  const out = stripVisualWorldTextPolicy(raw);
  assert.match(out, /白板塗鴉風格/);
  assert.match(out, /黑色粗墨水/);
  assert.doesNotMatch(out, /無任何畫布文字/);
  assert.doesNotMatch(out, /字幕/);

  const en = "Clean white canvas. No captions or labels anywhere. Warm yellow tags for highlights.";
  const enOut = stripVisualWorldTextPolicy(en);
  assert.equal(enOut, "Clean white canvas. Warm yellow tags for highlights.");
  // A policy-only visualWorld falls back to the original rather than an empty string.
  assert.equal(stripVisualWorldTextPolicy("No text at all."), "No text at all.");
});

test("enabled scene text quotes the clip narration on canvas", () => {
  const lines = sceneTextFrameLines(true, "zh-Hans", "你好世界");
  assert.match(lines.join("\n"), /subtitles ON/i);
  assert.match(lines.join("\n"), /你好世界/);
  assert.match(lines.join("\n"), /Mental Health/);
  assert.match(sceneTextSkillHint(true, "en"), /englishVo voiceover line/);
});

test("cartoon marker safe zone uppercases English and drops the bottom band", () => {
  const lines = sceneTextFrameLines(
    true,
    "en",
    "Every quant trader starts with this one tool",
    undefined,
    { markerSafeZone: true },
  );
  const text = lines.join("\n");
  assert.match(text, /marker lettering ON/i);
  assert.match(text, /52% and 60%/);
  assert.match(text, /EVERY QUANT TRADER STARTS/);
  assert.match(text, /WITH THIS ONE TOOL/);
  assert.match(text, /warm-yellow highlight box/);
  assert.doesNotMatch(text, /bottom 18%/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /52%/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /mixed-case/);
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
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /ONLY startVo/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /visual style/);
});

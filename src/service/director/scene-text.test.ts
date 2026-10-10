import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSceneTextLanguage,
  listicleCanvasTitle,
  listicleOnCanvasLines,
  resolveSceneText,
  sceneTextFrameLines,
  sceneTextNegativePrompt,
  sceneTextDirectorRevisionNote,
  sceneTextSkillHint,
  stripSceneVoiceoverRecap,
  stripStoryboardWriting,
  stripVisualWorldStyleEcho,
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
  assert.deepEqual(resolveSceneText({ language: "yue", sceneTextLanguage: "en" }), {
    enabled: true,
    language: "zh-Hant",
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

test("an item clip spells only the item it introduces", () => {
  const clips = [
    { clipNumber: 1, narrativeJob: "hook", englishVo: "Three morning mistakes." },
    { clipNumber: 2, narrativeJob: "item 1 of 3", englishVo: "Snooze the alarm." },
    { clipNumber: 3, narrativeJob: "item 2 of 3", englishVo: "Skip water." },
    { clipNumber: 4, narrativeJob: "full list", englishVo: "Fix one today." },
  ];
  const item = listicleOnCanvasLines({
    clips,
    clipNumber: 2,
    subtitle: "Snooze the alarm.",
  }).join("\n");
  assert.match(item, /only this item/i);
  assert.match(item, /low angle/);
  assert.match(item, /Snooze the alarm/);
  assert.match(item, /On-canvas subtitles ON/);
  assert.match(item, /Subtitle \(spell exactly\): "Snooze the alarm\."/);
  assert.doesNotMatch(item, /Skip water/);
  assert.doesNotMatch(item, /Three morning mistakes/);
  const next = listicleOnCanvasLines({ clips, clipNumber: 3 }).join("\n");
  assert.match(next, /overhead/);
  assert.doesNotMatch(next, /low angle/);
  const full = listicleOnCanvasLines({ clips, clipNumber: 4 }).join("\n");
  assert.match(full, /FULL LIST/);
  assert.match(full, /numbered list/i);
  assert.match(full, /Snooze the alarm/);
  assert.match(full, /Skip water/);
  const hook = listicleOnCanvasLines({
    clips,
    clipNumber: 1,
    subtitle: "Three morning mistakes.",
  }).join("\n");
  assert.match(hook, /largest text/i);
  assert.match(hook, /Count \(spell exactly\): "2"/);
  assert.match(hook, /Subtitle \(spell exactly\): "Three morning mistakes\."/);
  assert.match(hook, /Do not draw item titles/);
  assert.doesNotMatch(hook, /Snooze the alarm/);
});

test("listicle canvas title keeps the item name and drops the spoken explanation", () => {
  assert.equal(
    listicleCanvasTitle("Number one: Godly, for top-tier modern web design inspiration."),
    "Godly",
  );
  assert.equal(listicleCanvasTitle("Snooze the alarm."), "Snooze the alarm.");
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
  assert.match(hint, /selected text style/);
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

test("stripVisualWorldStyleEcho drops catalog restatements and keeps unique world-building", () => {
  const echoed =
    "Canvas: clean solid white canvas, as if sketched with a digital marker. Look: 2D hand-drawn cartoon. Typography: handwritten all-caps marker lettering. Motion: snappy pop. 白板塗鴉風格。純白背景黑色墨線。";
  assert.equal(stripVisualWorldStyleEcho(echoed), "白板塗鴉風格。純白背景黑色墨線。");
  assert.equal(
    stripVisualWorldStyleEcho(
      "Canvas: clean solid white canvas. Look: 2D cartoon. Typography: marker. Motion: pop.",
    ),
    "",
  );
});

test("stripSceneVoiceoverRecap drops the lettering recap and keeps the pose", () => {
  const scene =
    'Exactly one instance of Scro stands at center. On-canvas handwritten marker text centered at 56% frame height displays: "FOLLOW US RIGHT NOW".';
  assert.equal(stripSceneVoiceoverRecap(scene), "Exactly one instance of Scro stands at center.");
});

test("enabled scene text quotes the clip narration on canvas", () => {
  const lines = sceneTextFrameLines(true, "zh-Hans", "你好世界");
  assert.match(lines.join("\n"), /subtitles ON/i);
  assert.match(lines.join("\n"), /你好世界/);
  assert.match(lines.join("\n"), /Mental Health/);
  assert.match(sceneTextSkillHint(true, "en"), /spoken line/);
  assert.match(sceneTextSkillHint(true, "en"), /image prompt/);
});

test("reel safe zone stays in the center and does not take placement from a style", () => {
  const lines = sceneTextFrameLines(true, "en", "We made it", undefined, {
    reelSafeZone: true,
    look: "clean",
  });
  const text = lines.join("\n");
  assert.match(text, /center safe area/);
  assert.match(text, /torn-paper strips/);
  assert.match(text, /We made it/);
  assert.doesNotMatch(text, /70%/);
  assert.doesNotMatch(text, /bottom 18%/);
  assert.match(sceneTextSkillHint(true, "en", { reelSafeZone: true, look: "bold" }), /center safe area/);
  assert.match(sceneTextSkillHint(true, "en", { reelSafeZone: true, look: "bold" }), /condensed sans/);
  const bare = sceneTextFrameLines(true, "en", "We made it", undefined, { reelSafeZone: true }).join("\n");
  assert.doesNotMatch(bare, /bottom 18%/);
});

test("talking-head 9:16 subtitles sit a little below center, not in the bottom band", () => {
  const text = sceneTextFrameLines(true, "en", "We made it", undefined, {
    subtitlePlace: "below-center",
  }).join("\n");
  assert.match(text, /a little below the vertical center/);
  assert.match(text, /55%/);
  assert.match(text, /We made it/);
  assert.doesNotMatch(text, /bottom 18%/);
});

test("cartoon marker safe zone keeps spoken casing and drops the bottom band", () => {
  const lines = sceneTextFrameLines(
    true,
    "en",
    "Every quant trader starts with this one tool",
    undefined,
    { markerSafeZone: true },
  );
  const text = lines.join("\n");
  assert.match(text, /marker lettering ON/i);
  assert.doesNotMatch(text, /52% and 60%/);
  assert.match(text, /Every quant trader starts/);
  assert.match(text, /with this one tool/);
  assert.doesNotMatch(text, /EVERY QUANT TRADER STARTS/);
  assert.doesNotMatch(text, /warm-yellow/);
  assert.doesNotMatch(text, /bottom 18%/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /52%/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /mixed-case/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /beat title/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /STEP N|STEP 1/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /diagram/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /SYSTOLIC|TPU/i);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true }), /Do NOT invent a title card/);
  assert.match(text, /beat title/);
  assert.doesNotMatch(text, /STEP N|STEP 1/);
  assert.match(text, /diagram labels/);
  assert.doesNotMatch(text, /No title card/);
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

test("subtitle look changes lettering and never the director placement", () => {
  const marker = sceneTextFrameLines(true, "en", "Hello world now", undefined, {
    markerSafeZone: true,
    look: "bold",
  }).join("\n");
  assert.match(marker, /condensed sans/);
  assert.match(marker, /No bottom subtitle band/);
  assert.doesNotMatch(marker, /40%|70%|20%/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true, look: "clean" }), /torn-paper strips/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true, look: "clean" }), /not a bottom bar/);
  assert.doesNotMatch(sceneTextSkillHint(true, "en", { dualBeat: true, look: "clean" }), /40%/);
});

test("director revision note asks to drop invented labels when toggling", () => {
  assert.match(sceneTextDirectorRevisionNote(true, "en"), /englishVo/);
  assert.match(sceneTextDirectorRevisionNote(false, "en"), /OFF/);
  assert.match(sceneTextSkillHint(true, "en"), /only writing is that spoken line/i);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /ONLY startVo/);
  assert.match(sceneTextSkillHint(true, "en", { dualBeat: true }), /visual style/);
});

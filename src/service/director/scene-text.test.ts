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
  dropInventedSubtitleLock,
  storyboardAsksForSubtitle,
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
  assert.deepEqual(resolveSceneText({ sceneTextLanguage: "none" }), {
    enabled: false,
    language: "en",
    inWorldLabels: false,
  });
  assert.deepEqual(resolveSceneText({ language: "yue", sceneTextLanguage: "none", skillSlug: "listicle-director" }), {
    enabled: false,
    language: "en",
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

test("an item clip spells only the item it introduces without a voiceover subtitle", () => {
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
  assert.doesNotMatch(item, /On-canvas subtitles ON/);
  assert.doesNotMatch(item, /Subtitle \(spell exactly\)/);
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
  assert.match(hook, /Count \(spell exactly\): "2"/);
  assert.doesNotMatch(hook, /Subtitle \(spell exactly\)/);
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
  assert.equal(isSceneTextLanguage("none"), false);
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

test("enabled scene text allows in-scene text in the chosen language and forbids spoken subtitles", () => {
  const hint = sceneTextSkillHint(true, "en");
  assert.match(hint, /On-canvas text is ON/i);
  assert.match(hint, /Never generate spoken subtitles or voiceover captions/i);
  assert.doesNotMatch(hint, /Subtitle \(spell exactly\)/);
  const dualHint = sceneTextSkillHint(true, "en", { dualBeat: true });
  assert.match(dualHint, /diagram/i);
  assert.match(dualHint, /Never generate spoken subtitles/i);
  assert.doesNotMatch(dualHint, /Subtitle \(spell exactly\)/);
});

test("director revision note toggles on-screen text allowance without adding subtitles", () => {
  assert.match(sceneTextDirectorRevisionNote(true, "en"), /On-canvas text is now ON/);
  assert.match(sceneTextDirectorRevisionNote(true, "en"), /Never write Subtitle:/);
  assert.match(sceneTextDirectorRevisionNote(false, "en"), /OFF/);
});

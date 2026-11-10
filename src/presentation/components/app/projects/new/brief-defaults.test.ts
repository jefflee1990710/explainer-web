import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultCastIdsForStyle,
  defaultSceneTextLanguageForLocale,
  defaultVoLanguageForLocale,
  pickerDefaultSkillSlug,
  resolveDefaultVideoQualityTier,
  resolveInitialBriefCharacterIds,
  resolveInitialSceneTextLanguage,
  resolveInitialVoLanguage,
  sanitizeBriefDefaults,
  type BriefDefaults,
} from "@/presentation/components/app/projects/new/brief-defaults";

const skills = [{ slug: "dialogue-qa-director" }, { slug: "story-short-director" }];
const styles = [{ id: "doodle" as const }, { id: "paper-cutout" as const }];
const characters = [
  { id: "a", styleId: "doodle" as const },
  { id: "b", styleId: "doodle" as const },
  { id: "c", styleId: "paper-cutout" as const },
];

function raw(over: Partial<BriefDefaults> = {}): BriefDefaults {
  return {
    skillSlug: "dialogue-qa-director",
    styleId: "doodle",
    language: "zh",
    voiceGender: "female",
    speechPace: "fast",
    sceneTextLanguage: "zh-Hant",
    subtitleLook: "handwritten",
    textStyleId: "handwritten",
    aspectRatio: "9:16",
    durationPreset: "short",
    characterIds: ["a", "b"],
    ...over,
  };
}

test("sanitize keeps a complete last brief for this folder", () => {
  const next = sanitizeBriefDefaults(raw(), { skills, styles, characters });
  assert.deepEqual(next, raw());
});

test("sanitize drops unknown skill, style, and leftover characters", () => {
  const next = sanitizeBriefDefaults(
    raw({
      skillSlug: "gone",
      styleId: "neon" as BriefDefaults["styleId"],
      characterIds: ["a", "missing", "c"],
    }),
    { skills, styles, characters },
  );
  assert.equal(next?.skillSlug, "dialogue-qa-director");
  assert.equal(next?.styleId, "doodle");
  assert.deepEqual(next?.characterIds, ["a"]);
});

test("sanitize falls back to realistic for an unknown style when realistic is offered", () => {
  const next = sanitizeBriefDefaults(
    raw({ styleId: "neon" as BriefDefaults["styleId"], characterIds: [] }),
    { skills, styles: [...styles, { id: "realistic" as const }], characters },
  );
  assert.equal(next?.styleId, "realistic");
});

test("sanitize keeps Q&A to exactly two matching-style characters", () => {
  const next = sanitizeBriefDefaults(
    raw({ characterIds: ["a", "b", "c"] }),
    { skills, styles, characters },
  );
  assert.deepEqual(next?.characterIds, ["a", "b"]);
});

test("sanitize keeps story-short-director up to two characters and single-cast directors to one character", () => {
  const next = sanitizeBriefDefaults(
    raw({ skillSlug: "story-short-director", characterIds: ["a", "b"] }),
    { skills, styles, characters },
  );
  assert.deepEqual(next?.characterIds, ["a", "b"]);

  const single = sanitizeBriefDefaults(
    raw({ skillSlug: "one-take-director", characterIds: ["a", "b"] }),
    { skills: [...skills, { slug: "one-take-director" }], styles, characters },
  );
  assert.deepEqual(single?.characterIds, ["a"]);
});

test("sanitize caps cast by a custom director's template behaviour", () => {
  const next = sanitizeBriefDefaults(
    raw({ skillSlug: "custom-abc", characterIds: ["a", "b"] }),
    {
      skills: [...skills, { slug: "custom-abc", behaviorSlug: "talking-head-director" }],
      styles,
      characters,
    },
  );
  assert.equal(next?.skillSlug, "custom-abc");
  assert.deepEqual(next?.characterIds, ["a"]);
});

test("sanitize ignores junk and never stores source", () => {
  assert.equal(sanitizeBriefDefaults(null, { skills, styles, characters }), undefined);
  assert.equal(sanitizeBriefDefaults({ source: "secret" }, { skills, styles, characters }), undefined);
});

test("defaultCastIdsForStyle auto-selects matching ready characters for Step 01 and prioritizes Aera", () => {
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 1), ["a"]);
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 2), ["a", "b"]);
  assert.deepEqual(defaultCastIdsForStyle(characters, "paper-cutout", 2), []);
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 0), []);
  assert.deepEqual(
    defaultCastIdsForStyle(
      [
        { id: "other-realistic", name: "Maya", styleId: "realistic", previewUrl: "/maya.jpg" },
        { id: "aera-id", name: "Aera", styleId: "realistic", previewUrl: "/aera.jpg" },
      ],
      "realistic",
      1,
    ),
    ["aera-id"],
  );
});

test("pickerDefaultSkillSlug defaults to paper-cutout-explainer-video-director (02)", () => {
  assert.equal(
    pickerDefaultSkillSlug([
      { slug: "cartoon-explainer-video-director" },
      { slug: "paper-cutout-explainer-video-director" },
    ]),
    "paper-cutout-explainer-video-director",
  );
  assert.equal(
    pickerDefaultSkillSlug([{ slug: "story-short-director" }]),
    "story-short-director",
  );
});

test("defaultVoLanguageForLocale defaults zh-Hant to Cantonese (yue) and zh-Hans to Mandarin (zh)", () => {
  assert.equal(defaultVoLanguageForLocale("zh-Hant"), "yue");
  assert.equal(defaultVoLanguageForLocale("zh-Hans"), "zh");
  assert.equal(defaultVoLanguageForLocale("en"), "en");
  assert.equal(defaultSceneTextLanguageForLocale("zh-Hant"), "zh-Hant");
  assert.equal(defaultSceneTextLanguageForLocale("zh-Hans"), "zh-Hans");
  assert.equal(defaultSceneTextLanguageForLocale("en"), "en");
});

test("resolveInitialVoLanguage upgrades legacy unchosen 'en' defaults to 'yue' when UI is zh-Hant", () => {
  assert.equal(
    resolveInitialVoLanguage({ locale: "zh-Hant" }),
    "yue",
  );
  assert.equal(
    resolveInitialVoLanguage({
      locale: "zh-Hant",
      lastBrief: raw({ language: "en", languageExplicit: undefined }),
    }),
    "yue",
  );
  assert.equal(
    resolveInitialVoLanguage({
      locale: "zh-Hant",
      lastBrief: raw({ language: "en", languageExplicit: true }),
    }),
    "en",
  );
  assert.equal(
    resolveInitialSceneTextLanguage({
      locale: "zh-Hant",
      lastBrief: raw({ sceneTextLanguage: "en", languageExplicit: undefined }),
    }),
    "zh-Hant",
  );
});

test("resolveInitialBriefCharacterIds restores lastBrief characterIds or auto-selects a default character for paper-cutout explainer while keeping papercraft-diorama empty", () => {
  const readyChars = [
    { id: "scro-id", name: "Scro", styleId: "realistic", styleIds: ["realistic", "paper-cutout"], previewUrl: "/scro.jpg" },
    { id: "aera-id", name: "Aera", styleId: "realistic", styleIds: ["realistic"], previewUrl: "/aera.jpg" },
  ];

  // 1. Restores lastBrief characterIds when present and matching styleId
  assert.deepEqual(
    resolveInitialBriefCharacterIds({
      ruleSlug: "paper-cutout-explainer-video-director",
      styleId: "realistic",
      characters: readyChars,
      lastBrief: raw({ skillSlug: "paper-cutout-explainer-video-director", styleId: "realistic", characterIds: ["scro-id"] }),
    }),
    ["scro-id"],
  );

  // 2. Auto-selects 1 default character for paper-cutout-explainer-video-director when no lastBrief exists
  assert.deepEqual(
    resolveInitialBriefCharacterIds({
      ruleSlug: "paper-cutout-explainer-video-director",
      styleId: "realistic",
      characters: readyChars,
    }),
    ["aera-id"],
  );

  // 3. Keeps papercraft-diorama-director at 0 characters
  assert.deepEqual(
    resolveInitialBriefCharacterIds({
      ruleSlug: "papercraft-diorama-director",
      styleId: "papercraft-diorama",
      characters: readyChars,
      lastBrief: raw({ characterIds: ["scro-id"] }),
    }),
    [],
  );
});

test("resolveDefaultVideoQualityTier reads economy or 2k_cinema and defaults to 2k_cinema", () => {
  assert.equal(resolveDefaultVideoQualityTier("economy"), "economy");
  assert.equal(resolveDefaultVideoQualityTier("2k_cinema"), "2k_cinema");
  assert.equal(resolveDefaultVideoQualityTier(null), "2k_cinema");
  assert.equal(resolveDefaultVideoQualityTier("invalid"), "2k_cinema");
});



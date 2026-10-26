import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultCastIdsForStyle,
  initialSourceFromFolderName,
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

test("sanitize keeps every director except Q&A to one character", () => {
  const next = sanitizeBriefDefaults(
    raw({ skillSlug: "story-short-director", characterIds: ["a", "b"] }),
    { skills, styles, characters },
  );
  assert.deepEqual(next?.characterIds, ["a"]);
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

test("defaultCastIdsForStyle auto-selects matching ready characters for Step 01", () => {
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 1), ["a"]);
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 2), ["a", "b"]);
  assert.deepEqual(defaultCastIdsForStyle(characters, "paper-cutout", 2), []);
  assert.deepEqual(defaultCastIdsForStyle(characters, "doodle", 0), []);
});

test("initialSourceFromFolderName rescues prompt-like folder names typed during onboarding", () => {
  assert.equal(initialSourceFromFolderName("Testing 1"), "");
  assert.equal(initialSourceFromFolderName("新項目"), "");
  assert.equal(initialSourceFromFolderName("My First Project"), "");
  assert.equal(
    initialSourceFromFolderName("10年前我的媽媽可以看到一萬厘米的高山高樹和九千萬厘米的人。"),
    "10年前我的媽媽可以看到一萬厘米的高山高樹和九千萬厘米的人。",
  );
});

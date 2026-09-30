import assert from "node:assert/strict";
import { test } from "node:test";
import {
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

test("sanitize keeps Q&A to exactly two matching-style characters", () => {
  const next = sanitizeBriefDefaults(
    raw({ characterIds: ["a", "b", "c"] }),
    { skills, styles, characters },
  );
  assert.deepEqual(next?.characterIds, ["a", "b"]);
});

test("sanitize ignores junk and never stores source", () => {
  assert.equal(sanitizeBriefDefaults(null, { skills, styles, characters }), undefined);
  assert.equal(sanitizeBriefDefaults({ source: "secret" }, { skills, styles, characters }), undefined);
});

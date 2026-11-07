import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  characterStyleIds,
  foundationStyleId,
  originalCharacterSource,
  resolveBaseVersion,
  resolveVersionForStyle,
  versionStyleId,
} from "@/service/character/character-styles";
import { resolveDefaultVersion } from "@/service/character/versions";
import type { CharacterVersion } from "@/model/character";

function version(over: Partial<CharacterVersion> = {}): CharacterVersion {
  return {
    id: new ObjectId(),
    prompt: "a round face",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    blueprintUrl: "https://blob/sheet.png",
    ...over,
  };
}

test("missing version styleId belongs to the character style", () => {
  assert.equal(versionStyleId({ styleId: "doodle" }, {}), "doodle");
  assert.equal(versionStyleId({ styleId: "doodle" }, { styleId: "pixel" }), "pixel");
});

test("style ids keep the original first, then later styles once", () => {
  assert.deepEqual(
    characterStyleIds({
      styleId: "doodle",
      versions: [{}, { styleId: "pixel" }, { styleId: "pixel" }, { styleId: "clay" }],
    }),
    ["doodle", "pixel", "clay"],
  );
});

test("a new style uses the root photos, not an edited sheet", () => {
  const source = originalCharacterSource([
    {
      prompt: "original",
      referenceImageUrl: "https://blob/photo.png",
      referenceImageUrls: ["https://blob/photo.png"],
    },
    {
      parentVersionId: new ObjectId(),
      prompt: "edited",
      referenceImageUrl: "https://blob/sheet.png",
      referenceImageUrls: ["https://blob/sheet.png", "https://blob/photo.png"],
    },
  ]);
  assert.equal(source.prompt, "original");
  assert.deepEqual(source.referenceImageUrls, ["https://blob/photo.png"]);
});

test("the default sheet is used only when it matches the requested style", () => {
  const doodle = version({ styleId: "doodle", blueprintUrl: "https://blob/doodle.png" });
  const pixel = version({
    styleId: "pixel",
    blueprintUrl: "https://blob/pixel.png",
    createdAt: new Date("2026-02-01T00:00:00Z"),
  });
  const character = {
    styleId: "doodle",
    defaultVersionId: doodle.id,
    versions: [doodle, pixel],
  };
  assert.equal(resolveVersionForStyle(character, "doodle")?.blueprintUrl, "https://blob/doodle.png");
  assert.equal(resolveVersionForStyle(character, "pixel")?.blueprintUrl, "https://blob/pixel.png");
  assert.equal(resolveVersionForStyle(character, "clay"), null);
});

test("resolveVersionForStyle always picks the newest completed sheet for that style", () => {
  const older = version({
    styleId: "pixel",
    blueprintUrl: "https://blob/pixel-old.png",
    createdAt: new Date("2026-02-01T00:00:00Z"),
  });
  const newer = version({
    styleId: "pixel",
    blueprintUrl: "https://blob/pixel-new.png",
    createdAt: new Date("2026-03-01T00:00:00Z"),
  });
  const sheet = resolveVersionForStyle(
    {
      styleId: "doodle",
      styleDefaults: { pixel: older.id },
      versions: [older, newer],
    },
    "pixel",
  );
  assert.equal(sheet?.blueprintUrl, "https://blob/pixel-new.png");
});

test("foundationStyleId prefers realistic when present and falls back to character.styleId for legacy characters", () => {
  assert.equal(
    foundationStyleId({ styleId: "realistic", versions: [] }),
    "realistic",
  );
  assert.equal(
    foundationStyleId({ styleId: "doodle", versions: [{ styleId: "realistic" }] }),
    "realistic",
  );
  assert.equal(
    foundationStyleId({ styleId: "doodle", versions: [{ styleId: "doodle" }] }),
    "doodle",
  );
});

test("resolveVersionForStyle and resolveDefaultVersion ignore unapplied isBaseCandidate versions", () => {
  const v1 = version({
    styleId: "realistic",
    blueprintUrl: "https://blob/v1.png",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
  const candidate = version({
    styleId: "realistic",
    isBaseCandidate: true,
    blueprintUrl: "https://blob/candidate.png",
    createdAt: new Date("2026-02-01T00:00:00Z"),
  });
  const char = {
    styleId: "realistic",
    versions: [v1, candidate],
  };
  assert.equal(resolveVersionForStyle(char, "realistic")?.id, v1.id);
  assert.equal(resolveDefaultVersion(char)?.id, v1.id);
});

test("originalCharacterSource falls back to base version portraitUrl + profileUrl when raw referenceImageUrls are removed", () => {
  const baseId = new ObjectId();
  const source = originalCharacterSource(
    [
      {
        id: baseId,
        prompt: "base realistic look",
        portraitUrl: "https://blob/base-portrait.png",
        profileUrl: "https://blob/base-standing.png",
        blueprintUrl: "https://blob/base-board.png",
      },
      {
        id: new ObjectId(),
        parentVersionId: baseId,
        prompt: "edited outfit",
      },
    ],
    baseId,
  );
  assert.equal(source.prompt, "base realistic look");
  assert.deepEqual(source.referenceImageUrls, [
    "https://blob/base-portrait.png",
    "https://blob/base-standing.png",
  ]);
});

test("resolveBaseVersion returns the baseVersionId version when completed, or falls back to root realistic version", () => {
  const v1 = version({
    styleId: "realistic",
    portraitUrl: "https://blob/v1-portrait.png",
    profileUrl: "https://blob/v1-standing.png",
    blueprintUrl: "https://blob/v1-board.png",
  });
  const v2 = version({
    styleId: "realistic",
    portraitUrl: "https://blob/v2-portrait.png",
    profileUrl: "https://blob/v2-standing.png",
    blueprintUrl: "https://blob/v2-board.png",
  });
  assert.equal(
    resolveBaseVersion({ styleId: "realistic", baseVersionId: v2.id, versions: [v1, v2] })?.id,
    v2.id,
  );
  assert.equal(
    resolveBaseVersion({ styleId: "realistic", versions: [v1, v2] })?.id,
    v1.id,
  );
});


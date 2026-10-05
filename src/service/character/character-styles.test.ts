import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  characterStyleIds,
  originalCharacterSource,
  resolveVersionForStyle,
  versionStyleId,
} from "@/service/character/character-styles";
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

test("a style default stays on that style's older sheet", () => {
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
  assert.equal(sheet?.blueprintUrl, "https://blob/pixel-old.png");
});

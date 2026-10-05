import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { CharacterVersion } from "@/model/character";
import { characterBlueprintVoiceInput, fallbackCharacterVoice } from "@/service/character/infer-voice";

function version(over: Partial<CharacterVersion>): CharacterVersion {
  return {
    id: new ObjectId(),
    prompt: "adult woman in a black dress",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date(),
    ...over,
  };
}

test("fallback voice reads gender and age out of the description", () => {
  const child = fallbackCharacterVoice("Seven-year-old boy, round face");
  assert.equal(child.gender, "male");
  assert.equal(child.age, "young-adult");
  assert.equal(child.weight, "light");

  const woman = fallbackCharacterVoice("成年女性，短髮");
  assert.equal(woman.gender, "female");
  assert.equal(woman.age, "adult");

  const elder = fallbackCharacterVoice("elderly woman with a cane");
  assert.equal(elder.gender, "female");
  assert.equal(elder.age, "older");
  assert.equal(elder.pitch, "low");
});

test("blueprint voice input uses the default sheet, then one photo", () => {
  const sheet = version({
    blueprintUrl: "https://example.com/sheet.png",
    referenceImageUrls: ["https://example.com/photo.png", "https://example.com/extra.png"],
  });
  const queued = version({ status: "queued", createdAt: new Date(Date.now() + 1000) });
  const input = characterBlueprintVoiceInput({
    name: "Scro",
    defaultVersionId: sheet.id,
    versions: [sheet, queued],
  });
  assert.deepEqual(input, {
    name: "Scro",
    description: "adult woman in a black dress",
    referenceImageUrls: ["https://example.com/sheet.png", "https://example.com/photo.png"],
  });
  assert.equal(
    characterBlueprintVoiceInput({ name: "Scro", versions: [version({ status: "failed" })] }),
    null,
  );
});

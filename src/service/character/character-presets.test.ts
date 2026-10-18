import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { Character } from "@/model/character";
import { toPublicCharacter } from "@/presentation/serialize";
import {
  filterCharacterPresets,
  parseCharacterSelections,
  resolveCastVersion,
} from "@/service/character/character-presets";

function sampleCharacter(): Character {
  const userId = new ObjectId();
  const charId = new ObjectId("6ad447d920897d3c6771ccb4");
  const v1Id = new ObjectId("6ad447d920897d3c6771cc01");
  const v2Id = new ObjectId("6ad447d920897d3c6771cc02");
  const preset1Id = new ObjectId("6ad447d920897d3c6771cca1");
  const preset2Id = new ObjectId("6ad447d920897d3c6771cca2");

  return {
    _id: charId,
    userId,
    clerkUserId: "user_1",
    name: "Alex",
    styleId: "realistic",
    defaultVersionId: v1Id,
    versions: [
      {
        id: v1Id,
        styleId: "realistic",
        prompt: "Young founder in white tee",
        blueprintKind: "board",
        portraitUrl: "https://example.com/v1-portrait.png",
        blueprintUrl: "https://example.com/v1-board.png",
        status: "completed",
        creditsCharged: true,
        createdAt: new Date("2026-10-18T10:00:00.000Z"),
      },
      {
        id: v2Id,
        styleId: "realistic",
        parentVersionId: v1Id,
        prompt: "Young founder in white tee\n變更：Change top to navy blazer and wavy hair",
        editInstruction: "Change top to navy blazer and wavy hair",
        blueprintKind: "board",
        portraitUrl: "https://example.com/v2-portrait.png",
        blueprintUrl: "https://example.com/v2-board.png",
        status: "completed",
        creditsCharged: true,
        createdAt: new Date("2026-10-18T11:00:00.000Z"),
      },
    ],
    presets: [
      {
        id: preset1Id,
        name: "Casual White Tee",
        versionId: v1Id,
        styleId: "realistic",
        createdAt: new Date("2026-10-18T10:05:00.000Z"),
      },
      {
        id: preset2Id,
        name: "Keynote Navy Suit",
        versionId: v2Id,
        styleId: "realistic",
        createdAt: new Date("2026-10-18T11:05:00.000Z"),
      },
    ],
    createdAt: new Date("2026-10-18T10:00:00.000Z"),
    updatedAt: new Date("2026-10-18T11:05:00.000Z"),
  };
}

describe("character presets", () => {
  it("serializes saved presets on PublicCharacter with resolved version metadata", () => {
    const doc = sampleCharacter();
    const pub = toPublicCharacter(doc);
    assert.equal(pub.presets.length, 2);
    // Newest preset first
    assert.equal(pub.presets[0]?.name, "Keynote Navy Suit");
    assert.equal(pub.presets[0]?.versionNumber, 2);
    assert.equal(pub.presets[0]?.blueprintUrl, "https://example.com/v2-board.png");
    assert.equal(pub.presets[1]?.name, "Casual White Tee");
    assert.equal(pub.presets[1]?.versionNumber, 1);
  });

  it("parses valid characterSelections JSON and ignores malformed entries", () => {
    const charId = "6ad447d920897d3c6771ccb4";
    const presetId = "6ad447d920897d3c6771cca2";
    const versionId = "6ad447d920897d3c6771cc02";
    const parsed = parseCharacterSelections(
      JSON.stringify({
        [charId]: { versionId, presetId, presetName: "Keynote Navy Suit" },
        invalidKey: { versionId },
      }),
    );
    assert.deepEqual(parsed, {
      [charId]: { versionId, presetId, presetName: "Keynote Navy Suit" },
    });
    assert.deepEqual(parseCharacterSelections("not-json"), {});
  });

  it("resolves the selected preset version in resolveCastVersion and falls back to style default", () => {
    const doc = sampleCharacter();
    // Select preset1 (which points to v1, not the newest v2)
    const chosen = resolveCastVersion(doc, "realistic", {
      presetId: "6ad447d920897d3c6771cca1",
    });
    assert.equal(chosen.version?.id.toHexString(), "6ad447d920897d3c6771cc01");
    assert.equal(chosen.preset?.name, "Casual White Tee");

    // Unknown presetId falls back to style default (newest completed v2)
    const fallback = resolveCastVersion(doc, "realistic", {
      presetId: new ObjectId().toHexString(),
    });
    assert.equal(fallback.version?.id.toHexString(), "6ad447d920897d3c6771cc02");
    assert.equal(fallback.preset, undefined);
  });

  it("filters character presets by preset name, character name, or edit instruction", () => {
    const pub = toPublicCharacter(sampleCharacter());
    const byName = filterCharacterPresets([pub], "realistic", "navy");
    assert.equal(byName.length, 1);
    assert.equal(byName[0]?.preset.name, "Keynote Navy Suit");

    const byChar = filterCharacterPresets([pub], "realistic", "alex");
    assert.equal(byChar.length, 2);

    const noMatch = filterCharacterPresets([pub], "realistic", "hoodie");
    assert.equal(noMatch.length, 0);
  });
});

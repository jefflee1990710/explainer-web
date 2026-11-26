import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasLibraryAsset } from "@/model/canvas-dto";
import {
  canvasOutfitPresetName,
  canvasOutfitVersionFlags,
  characterOutfitEditInstruction,
  findCharacterNodeAt,
  libraryAssetNodeDraft,
  outfitHandleForPart,
  outfitWiresFromGraph,
} from "@/service/canvas/core/character-node";

const character: CanvasLibraryAsset = {
  id: "char-1",
  source: "character",
  name: "Jim",
  mediaKind: "image",
  url: "https://blob.example/jim.png",
  createdAt: "2026-11-22T00:00:00.000Z",
};

const blazer: CanvasLibraryAsset = {
  id: "wardrobe-1",
  source: "outfit",
  name: "Navy blazer",
  mediaKind: "image",
  url: "https://blob.example/blazer.png",
  createdAt: "2026-11-22T00:00:00.000Z",
  outfitPart: "top",
  outfitPrompt: "a navy wool blazer",
};

describe("canvas character nodes", () => {
  it("places a character asset as a character node and an outfit as an image", () => {
    const person = libraryAssetNodeDraft(character);
    assert.equal(person.type, "character");
    assert.equal(person.data.characterId, "char-1");
    assert.equal(person.data.mediaUrl, character.url);

    const piece = libraryAssetNodeDraft(blazer);
    assert.equal(piece.type, "media");
    assert.equal(piece.data.mediaKind, "image");
    assert.equal(piece.data.toolParams?.outfitPart, "top");
    assert.equal(piece.data.toolParams?.outfitPrompt, "a navy wool blazer");
    assert.equal(outfitHandleForPart("top"), "top");
    assert.equal(outfitHandleForPart("look"), "looks");
  });

  it("builds a wardrobe edit from each connected outfit", () => {
    const text = characterOutfitEditInstruction([
      { handle: "top", name: "Navy blazer", prompt: "a navy wool blazer" },
      { handle: "looks", name: "Summer linen" },
    ]);
    assert.equal(text, "Top: a navy wool blazer; Outfit: Summer linen");
    assert.equal(canvasOutfitPresetName([{ handle: "top", name: "Navy blazer" }]), "Navy blazer");
    assert.equal(characterOutfitEditInstruction([]), "");
  });

  it("reads wires from the graph and finds a character under the pointer", () => {
    const wires = outfitWiresFromGraph(
      "character-1",
      [
        {
          id: "media-1",
          type: "media",
          position: { x: 0, y: 0 },
          data: { label: "Navy blazer", toolParams: { outfitPrompt: "a navy wool blazer" } },
        },
      ],
      [{ source: "media-1", target: "character-1", targetHandle: "top" }],
    );
    assert.deepEqual(wires, [
      { handle: "top", name: "Navy blazer", prompt: "a navy wool blazer" },
    ]);
    assert.equal(
      findCharacterNodeAt(
        [{ id: "character-1", type: "character", position: { x: 100, y: 80 } }],
        { x: 120, y: 100 },
      ),
      "character-1",
    );
    assert.equal(
      findCharacterNodeAt(
        [{ id: "media-1", type: "media", position: { x: 100, y: 80 } }],
        { x: 120, y: 100 },
      ),
      undefined,
    );
  });

  it("keeps the character outfit unless the canvas checkbox asks to update the default", () => {
    assert.deepEqual(canvasOutfitVersionFlags(false), { canvasOneOff: true });
    assert.deepEqual(canvasOutfitVersionFlags(true), {});
  });
});

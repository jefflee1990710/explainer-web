import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { IMAGE_COST_USD } from "@/service/credit-costs";
import { resolveNodeInputs, validateEdgeConnection } from "@/service/canvas/core/graph";
import { OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } from "@/service/openrouter/generate";
import {
  CHARACTER_BLUEPRINT_MODEL_ID,
  CHARACTER_BLUEPRINT_PROVIDER_MODEL_ID,
  CHARACTER_BLUEPRINT_REF_MAX,
  blueprintAttachPlan,
  blueprintDropHandle,
  canvasBlueprintVersionFields,
  characterBlueprintGap,
  characterBlueprintPrompt,
  characterBlueprintReferenceUrls,
  emptyCharacterBlueprintData,
  findPortraitDropTarget,
  parseCanvasCharacterSave,
} from "@/service/canvas/core/character-blueprint";

function media(id: string, url: string, extra?: CanvasNode["data"]): CanvasNode {
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: id, mediaKind: "image", mediaUrl: url, ...extra },
  };
}

function blueprintNode(): CanvasNode {
  return {
    id: "hero",
    type: "model",
    position: { x: 200, y: 40 },
    data: emptyCharacterBlueprintData(),
  };
}

describe("empty canvas character", () => {
  it("drops as an empty character with no saved person or blueprint", () => {
    const data = emptyCharacterBlueprintData();
    assert.equal(data.modelId, CHARACTER_BLUEPRINT_MODEL_ID);
    assert.equal(data.label, "");
    assert.equal(data.characterId, undefined);
    assert.equal(data.mediaUrl, undefined);
    assert.equal(data.outputUrl, undefined);
    assert.equal(data.status, "idle");
    assert.equal(characterBlueprintGap({ prompt: "", imageCount: 0 }), "empty");
    assert.equal(characterBlueprintGap({ prompt: "short hair", imageCount: 0 }), null);
  });

  it("uses Seedream 5.0 Pro at the same price as one 2K still", () => {
    const spec = findCanvasModel(CHARACTER_BLUEPRINT_MODEL_ID);
    assert.ok(spec);
    assert.equal(spec.providerModelId, CHARACTER_BLUEPRINT_PROVIDER_MODEL_ID);
    assert.equal(spec.providerModelId, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL);
    assert.equal(estimateCanvasModelCostUsd(spec), IMAGE_COST_USD);
    assert.equal(spec.inputs.find((port) => port.id === "refImages")?.maxConnections, CHARACTER_BLUEPRINT_REF_MAX);
    assert.ok(spec.inputs.some((port) => port.id === "top"));
    assert.equal(spec.hiddenInSidebar, undefined);
  });

  it("hits the topmost character or blueprint under a drop", () => {
    const nodes = [
      { id: "library", type: "character", position: { x: 0, y: 0 } },
      {
        id: "draft",
        type: "model",
        position: { x: 20, y: 20 },
        data: { modelId: CHARACTER_BLUEPRINT_MODEL_ID },
      },
    ];
    assert.deepEqual(findPortraitDropTarget(nodes, { x: 40, y: 40 }), { id: "draft", kind: "blueprint" });
    assert.deepEqual(findPortraitDropTarget(nodes, { x: 10, y: 10 }), { id: "library", kind: "character" });
    assert.equal(findPortraitDropTarget(nodes, { x: 900, y: 900 }), undefined);
  });

  it("sends outfit pieces to their slot and other images to the photo input", () => {
    assert.equal(blueprintDropHandle({ mediaKind: "image", source: "outfit", outfitPart: "top" }), "top");
    assert.equal(blueprintDropHandle({ mediaKind: "image", source: "outfit" }), "looks");
    assert.equal(blueprintDropHandle({ mediaKind: "image", source: "canvas_output" }), "refImages");
    assert.equal(blueprintDropHandle({ mediaKind: "video" }), null);
    assert.equal(blueprintAttachPlan([], "hero", "top"), "add");
    assert.equal(
      blueprintAttachPlan([{ target: "hero", targetHandle: "top" }], "hero", "top"),
      "replace",
    );
    const full = Array.from({ length: CHARACTER_BLUEPRINT_REF_MAX }, () => ({
      target: "hero",
      targetHandle: "refImages",
    }));
    assert.equal(blueprintAttachPlan(full, "hero", "refImages"), "full");
  });

  it("accepts several photos plus one outfit, and keeps Seedream's reference cap", () => {
    const photos = [media("a", "https://blob.example/a.png"), media("b", "https://blob.example/b.png")];
    const jacket = media("jacket", "https://blob.example/jacket.png", {
      label: "Navy blazer",
      toolParams: { outfitPrompt: "a navy wool blazer" },
    });
    const hero = blueprintNode();
    const nodes = [...photos, jacket, hero];
    const edges: CanvasEdge[] = [
      { id: "e1", source: "a", sourceHandle: "output", target: "hero", targetHandle: "refImages" },
      { id: "e2", source: "b", sourceHandle: "output", target: "hero", targetHandle: "refImages" },
      { id: "e3", source: "jacket", sourceHandle: "output", target: "hero", targetHandle: "top" },
    ];
    assert.equal(
      validateEdgeConnection(nodes, edges.slice(0, 1), {
        source: "b",
        sourceHandle: "output",
        target: "hero",
        targetHandle: "refImages",
      }).valid,
      true,
    );
    assert.equal(
      validateEdgeConnection(nodes, [], {
        source: "a",
        sourceHandle: "output",
        target: "hero",
        targetHandle: "video",
      }).valid,
      false,
    );
    const resolved = resolveNodeInputs("hero", nodes, edges);
    assert.equal(resolved.ok, true);
    assert.deepEqual(resolved.inputs.refImages, [
      "https://blob.example/a.png",
      "https://blob.example/b.png",
    ]);
    assert.deepEqual(resolved.inputs.outfitRefs, [
      {
        handle: "top",
        url: "https://blob.example/jacket.png",
        name: "Navy blazer",
        prompt: "a navy wool blazer",
      },
    ]);
    const prompt = characterBlueprintPrompt({
      name: "Mia",
      description: resolved.inputs.prompt,
      outfitWires: resolved.inputs.outfitRefs ?? [],
      photoCount: resolved.inputs.refImages.length,
    });
    assert.match(prompt, /Mia/);
    assert.match(prompt, /navy wool blazer/);
    const urls = characterBlueprintReferenceUrls({
      refImages: Array.from({ length: 10 }, (_, index) => `https://blob.example/p${index}.png`),
      outfitUrls: Array.from({ length: 8 }, (_, index) => `https://blob.example/o${index}.png`),
    });
    assert.equal(urls.length, 14);
    assert.equal(urls[0], "https://blob.example/p0.png");
    assert.equal(urls[10], "https://blob.example/o0.png");
  });

  it("saves a finished https blueprint and refuses a blank name", () => {
    assert.equal(parseCanvasCharacterSave({ name: "  ", blueprintUrl: "https://blob.example/a.png" }).ok, false);
    const parsed = parseCanvasCharacterSave({
      name: "  Mia  ",
      blueprintUrl: "https://blob.example/board.png",
      prompt: "warm smile",
      referenceImageUrls: ["https://blob.example/a.png", "http://insecure.example/a.png", "https://blob.example/a.png"],
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.name, "Mia");
    assert.deepEqual(parsed.value.referenceImageUrls, ["https://blob.example/a.png"]);
    const fields = canvasBlueprintVersionFields({ ...parsed.value, now: new Date("2026-11-27T00:00:00.000Z") });
    assert.equal(fields.status, "completed");
    assert.equal(fields.creditsCharged, false);
    assert.equal(fields.blueprintKind, "sheet");
    assert.equal(fields.blueprintUrl, "https://blob.example/board.png");
    assert.equal(fields.portraitUrl, fields.blueprintUrl);
  });
});

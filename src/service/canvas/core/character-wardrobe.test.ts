import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import {
  canvasWardrobeLockLine,
  characterOutfitPending,
  characterOutfitPendingMessage,
  pendingCharacterOutfitSources,
  withCanvasWardrobeLock,
} from "@/service/canvas/core/character-wardrobe";
import { resolveNodeInputs } from "@/service/canvas/core/graph";

const NANO = "google:gemini-nano-banana-2.1";

function node(id: string, type: CanvasNode["type"], data: Partial<CanvasNodeData> = {}): CanvasNode {
  return { id, type, position: { x: 0, y: 0 }, data: { status: "idle", ...data } };
}

function edge(source: string, target: string, targetHandle: string): CanvasEdge {
  return { id: `${source}-${target}-${targetHandle}`, source, sourceHandle: "output", target, targetHandle };
}

const jim = (data: Partial<CanvasNodeData> = {}) =>
  node("jim", "character", {
    label: "Jim",
    characterId: "6afaa18cbdd00015c634043e",
    mediaKind: "image",
    mediaUrl: "https://blob.example/jim-default.png",
    ...data,
  });
const blazer = node("blazer", "media", {
  label: "Blazer",
  mediaKind: "image",
  mediaUrl: "https://blob.example/blazer.png",
  toolParams: { outfitPart: "top", outfitPrompt: "navy blazer" },
});
const scene = node("scene", "media", { mediaKind: "image", mediaUrl: "https://blob.example/office.png" });
const image = node("img", "model", { modelId: NANO, prompt: "Jim walks through a rainy street" });

describe("canvas wardrobe lock prompt", () => {
  it("names the character reference image as the outfit source of truth", () => {
    const line = canvasWardrobeLockLine([1]);
    assert.match(line, /^WARDROBE LOCK: Reference image 1 is the character;/);
    assert.match(line, /only source of truth for that character's outfit/);
    assert.match(line, /ignore any clothing wording in the text/);
  });

  it("lists several character references", () => {
    assert.match(canvasWardrobeLockLine([1, 3]), /Reference images 1 and 3 are the characters; each one is/);
    assert.match(canvasWardrobeLockLine([1, 2, 4]), /Reference images 1, 2 and 4/);
  });

  it("appends the lock after the prompt only when a character is referenced", () => {
    assert.equal(withCanvasWardrobeLock("A rainy street", undefined), "A rainy street");
    assert.equal(withCanvasWardrobeLock("A rainy street", []), "A rainy street");
    assert.equal(withCanvasWardrobeLock("A rainy street", [2]), `A rainy street\n\n${canvasWardrobeLockLine([2])}`);
    assert.equal(withCanvasWardrobeLock("  ", [1]), canvasWardrobeLockLine([1]));
  });

  it("records character positions in refImages", () => {
    const res = resolveNodeInputs(
      "img",
      [scene, jim({ outputUrl: "https://blob.example/jim-new.png", status: "completed" }), image],
      [edge("scene", "img", "refImages"), edge("jim", "img", "refImages")],
    );
    assert.equal(res.ok, true);
    assert.deepEqual(res.inputs.refImages, ["https://blob.example/office.png", "https://blob.example/jim-new.png"]);
    assert.deepEqual(res.inputs.characterRefPositions, [2]);
  });

  it("skips the lock when an outfit piece is wired straight into the model", () => {
    const res = resolveNodeInputs(
      "img",
      [jim(), blazer, image],
      [edge("jim", "img", "refImages"), edge("blazer", "img", "refImages")],
    );
    assert.equal(res.ok, true);
    assert.equal(res.inputs.characterRefPositions, undefined);
  });
});

describe("pending character outfit guard", () => {
  it("is clear when no outfit is wired, or the new look is done", () => {
    assert.equal(characterOutfitPending(jim(), []), undefined);
    const done = jim({ status: "completed", outputUrl: "https://blob.example/jim-new.png" });
    assert.equal(characterOutfitPending(done, [edge("blazer", "jim", "top")]), undefined);
  });

  it("flags wired outfit pieces that were never generated, or failed", () => {
    const wires = [edge("blazer", "jim", "top")];
    assert.deepEqual(characterOutfitPending(jim(), wires), { nodeId: "jim", name: "Jim", state: "not_generated" });
    assert.equal(characterOutfitPending(jim({ status: "failed" }), wires)?.state, "not_generated");
  });

  it("flags an outfit that is still generating, even over an older look", () => {
    const wires = [edge("blazer", "jim", "looks")];
    const running = jim({ status: "running", outputUrl: "https://blob.example/jim-old.png" });
    assert.equal(characterOutfitPending(running, wires)?.state, "generating");
    assert.equal(characterOutfitPending(jim({ status: "queued" }), wires)?.state, "generating");
  });

  it("ignores wires that are not outfit slots", () => {
    assert.equal(characterOutfitPending(jim(), [edge("x", "jim", "prompt")]), undefined);
  });

  it("blocks the downstream run with a clear reason", () => {
    const nodes = [jim(), blazer, image];
    const edges = [edge("blazer", "jim", "top"), edge("jim", "img", "refImages")];
    assert.deepEqual(pendingCharacterOutfitSources("img", nodes, edges).map((p) => p.nodeId), ["jim"]);
    const res = resolveNodeInputs("img", nodes, edges);
    assert.equal(res.ok, false);
    assert.ok(!res.ok);
    assert.match(res.reason ?? "", /角色「Jim」已接上穿搭，但新造型尚未生成/);
    assert.deepEqual(res.missingUpstreamNodeIds, []);
  });

  it("runs once the new look is generated", () => {
    const done = jim({ status: "completed", outputUrl: "https://blob.example/jim-new.png" });
    const res = resolveNodeInputs("img", [done, blazer, image], [
      edge("blazer", "jim", "top"),
      edge("jim", "img", "refImages"),
    ]);
    assert.equal(res.ok, true);
    assert.deepEqual(res.inputs.refImages, ["https://blob.example/jim-new.png"]);
    assert.deepEqual(res.inputs.characterRefPositions, [1]);
  });

  it("writes zh and en messages for both states", () => {
    const pending = [
      { nodeId: "a", name: "Jim", state: "not_generated" as const },
      { nodeId: "b", name: "Mia", state: "generating" as const },
    ];
    assert.match(characterOutfitPendingMessage(pending), /Jim.*生成新造型.*Mia.*仍在生成中/);
    assert.match(characterOutfitPendingMessage(pending, false), /Jim has outfit pieces wired.*Mia's new outfit is still generating/);
  });
});

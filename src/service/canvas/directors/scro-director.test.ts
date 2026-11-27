import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { computeExecutionWaves } from "@/service/canvas/core/graph";
import { SEEDREAM_MODEL_ID } from "@/service/canvas/scro-groups/builder";
import {
  buildSwapDirectorGroup,
  buildTeleportDirectorGroup,
  isScroDirectorNode,
  isSwapDirectorNode,
} from "@/service/canvas/directors/scro-director";

function director(modelId: string, data: CanvasNode["data"] = {}): CanvasNode {
  return {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId,
      aspectRatio: "9:16",
      status: "idle",
      ...data,
      toolParams: { directorMode: true, sectionStart: 1, sectionLength: 9, ...(data.toolParams ?? {}) },
    },
  };
}

const origin = { directorId: "dir", idPrefix: "swap-1", origin: { x: 400, y: 0 } };

describe("scro director build", () => {
  it("treats only directorMode Swap and Teleport cards as directors", () => {
    assert.equal(isSwapDirectorNode(director("scro:swap")), true);
    assert.equal(isScroDirectorNode(director("scro:teleport")), true);
    assert.equal(
      isScroDirectorNode({ type: "model", data: { modelId: "scro:swap", toolParams: { swapMode: "character" } } }),
      false,
    );
    assert.equal(isScroDirectorNode(director("scro:explainer")), false);
  });

  it("builds Swap trim, render, and grade from the wired video and reference", () => {
    const built = buildSwapDirectorGroup(
      director("scro:swap", { prompt: "blue jacket", toolParams: { swapMode: "character" } }),
      { ...origin, videoNodeId: "clip", referenceNodeId: "ref" },
    );
    assert.ok(!("error" in built));
    if ("error" in built) return;
    assert.deepEqual(built.memberIds[0], "dir");
    assert.ok(built.expandedNodeIds.includes("swap-1-trim"));
    assert.ok(!built.expandedNodeIds.includes("clip"));
    assert.ok(!built.expandedNodeIds.includes("dir"));
    const render = built.group.nodes.find((n) => n.id === "swap-1-render");
    assert.equal(render?.data.modelId, "scro:swap-render");
    assert.equal(render?.data.durationSeconds, 9);
    assert.equal(render?.data.toolParams?.swapMode, "character");
    assert.ok(built.group.edges.some((e) => e.source === "clip" && e.target === "swap-1-trim"));
    assert.ok(built.group.edges.some((e) => e.source === "ref" && e.target === "swap-1-render" && e.targetHandle === "refImages"));
    assert.equal(built.group.nodes.find((n) => n.id === "swap-1-instruction")?.data.text, "blue jacket");
  });

  it("builds a character swap from the selected character when no reference image is wired", () => {
    const built = buildSwapDirectorGroup(
      director("scro:swap", { toolParams: { swapMode: "character", characterId: "jim" } }),
      { ...origin, videoNodeId: "clip" },
    );
    assert.ok(!("error" in built));
    if ("error" in built) return;
    const render = built.group.nodes.find((n) => n.id === "swap-1-render");
    assert.equal(render?.data.toolParams?.characterId, "jim");
    assert.equal(render?.data.toolParams?.swapMode, "character");
    assert.equal(built.group.edges.some((e) => e.targetHandle === "refImages"), false);
  });

  it("refuses a character swap with no reference and an object swap with no instruction", () => {
    const missingRef = buildSwapDirectorGroup(director("scro:swap"), { ...origin, videoNodeId: "clip" });
    assert.deepEqual(missingRef, { error: "reference" });
    const missingObject = buildSwapDirectorGroup(
      director("scro:swap", { toolParams: { swapMode: "object" } }),
      { ...origin, videoNodeId: "clip" },
    );
    assert.deepEqual(missingObject, { error: "object" });
    const missingVideo = buildSwapDirectorGroup(director("scro:swap"), origin);
    assert.deepEqual(missingVideo, { error: "video" });
  });

  it("draws a Teleport scene plate from text, and uses a wired photo instead", () => {
    const fromText = buildTeleportDirectorGroup(
      director("scro:teleport", { prompt: "colder", toolParams: { sceneText: "a rainy alley" } }),
      { ...origin, idPrefix: "tp-1", videoNodeId: "clip" },
    );
    assert.ok(!("error" in fromText));
    if ("error" in fromText) return;
    assert.equal(fromText.group.nodes.find((n) => n.id === "tp-1-scene")?.data.modelId, SEEDREAM_MODEL_ID);
    assert.equal(fromText.group.nodes.find((n) => n.id === "tp-1-render")?.data.prompt, "colder");

    const fromPhoto = buildTeleportDirectorGroup(
      director("scro:teleport", { toolParams: { sceneText: "ignored when a photo is wired" } }),
      { ...origin, idPrefix: "tp-2", videoNodeId: "clip", referenceNodeId: "photo" },
    );
    assert.ok(!("error" in fromPhoto));
    if ("error" in fromPhoto) return;
    assert.equal(fromPhoto.group.nodes.some((n) => n.data.modelId === SEEDREAM_MODEL_ID), false);
    assert.ok(fromPhoto.group.edges.some((e) => e.source === "photo" && e.targetHandle === "image"));
  });

  it("does not run a director card until Build adds the render nodes", () => {
    const card = director("scro:swap");
    assert.deepEqual(computeExecutionWaves([card], []), []);
    const built = buildSwapDirectorGroup(card, {
      ...origin,
      videoNodeId: "clip",
      referenceNodeId: "ref",
    });
    assert.ok(!("error" in built));
    if ("error" in built) return;
    const waves = computeExecutionWaves(
      [card, ...built.group.nodes],
      built.group.edges,
    );
    assert.equal(waves.flat().includes("dir"), false);
    assert.ok(waves.flat().includes("swap-1-render"));
  });
});

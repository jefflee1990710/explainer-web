import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import { SEEDREAM_MODEL_ID } from "@/service/canvas/scro-groups/builder";
import { buildBlankSwapGroup, buildSwapGroup } from "@/service/canvas/scro-groups/swap";
import { buildBlankTeleportGroup, buildTeleportGroup } from "@/service/canvas/scro-groups/teleport";
import { buildTeleportScenePlatePrompt } from "@/service/teleport/prompts";

const ctx = { idPrefix: "g", origin: { x: 0, y: 0 } };
const clip = { url: "https://x/v.mp4", name: "clip.mp4", mediaKind: "video" as const };
const jim = { url: "https://x/jim.png", name: "Jim", mediaKind: "image" as const };

const wires = (g: ScroGroup) => g.edges.map((e) => `${e.source}>${e.target}:${e.targetHandle}`).sort();
const node = (g: ScroGroup, id: string) => g.nodes.find((n) => n.id === id)!;

describe("buildSwapGroup", () => {
  it("colorfix is just a grade on the whole video", () => {
    const g = buildSwapGroup(ctx, {
      video: clip,
      mode: "colorfix",
      sectionStart: 0,
      sectionLength: 6,
      aspectRatio: "9:16",
    });
    assert.equal(g.nodes.length, 2);
    assert.deepEqual(wires(g), ["g-video>g-grade:video"]);
    assert.ok(!g.nodes.some((n) => n.type === "settings"));
    assert.equal(node(g, "g-grade").data.toolParams?.gradeLook, "jutsu");
  });

  it("a blank drop is trim, character render, and grade, with the video port open", () => {
    const g = buildBlankSwapGroup(ctx);
    assert.deepEqual(wires(g), ["g-render>g-grade:video", "g-trim>g-render:video"]);
    assert.equal(node(g, "g-render").data.modelId, "scro:swap-render");
    assert.equal(node(g, "g-render").data.toolParams?.swapMode, "character");
    assert.equal(node(g, "g-trim").data.toolParams?.ffmpegEndSec, 6);
    assert.ok(!g.nodes.some((n) => n.type === "media"));
  });

  it("character swap trims, renders with the reference, then grades", () => {
    const g = buildSwapGroup(ctx, {
      video: { nodeId: "existing-video" },
      mode: "character",
      reference: jim,
      instruction: "keep the smile",
      sectionStart: 2,
      sectionLength: 6,
      aspectRatio: "9:16",
    });
    assert.deepEqual(wires(g), [
      "existing-video>g-trim:video",
      "g-instruction>g-render:prompt",
      "g-reference>g-render:refImages",
      "g-render>g-grade:video",
      "g-trim>g-render:video",
    ]);
    assert.deepEqual(node(g, "g-trim").data.toolParams, {
      ffmpegStartSec: 2,
      ffmpegEndSec: 8,
      ffmpegSpeed: 1,
    });
    assert.equal(node(g, "g-render").data.durationSeconds, 6);
    assert.equal(node(g, "g-render").data.toolParams?.swapMode, "character");
    assert.equal(g.outputNodeId, "g-grade");
    assert.ok(!g.nodes.some((n) => n.id === "g-video"));
  });

  it("clamps the section to 2-15s", () => {
    const g = buildSwapGroup(ctx, {
      video: clip,
      mode: "relight",
      lightLookId: "golden",
      sectionStart: 0,
      sectionLength: 40,
      aspectRatio: "16:9",
    });
    assert.equal(node(g, "g-render").data.durationSeconds, 15);
    assert.equal(node(g, "g-render").data.toolParams?.lightLookId, "golden");
  });
});

describe("buildTeleportGroup", () => {
  it("uses a scene photo", () => {
    const g = buildTeleportGroup(ctx, {
      video: clip,
      scene: { kind: "image", ref: { url: "https://x/beach.png", name: "beach", mediaKind: "image" } },
      sectionStart: 0,
      sectionLength: 5,
      aspectRatio: "9:16",
    });
    assert.deepEqual(wires(g), [
      "g-render>g-grade:video",
      "g-scene>g-render:image",
      "g-trim>g-render:video",
      "g-video>g-trim:video",
    ]);
    assert.equal(node(g, "g-scene").type, "media");
  });

  it("draws a scene plate from text and puts the mood in the render prompt", () => {
    const g = buildTeleportGroup(ctx, {
      video: clip,
      scene: { kind: "text", text: "Tokyo street at night" },
      mood: "neon rain",
      sectionStart: 0,
      sectionLength: 6,
      aspectRatio: "9:16",
    });
    assert.equal(node(g, "g-scene").data.modelId, SEEDREAM_MODEL_ID);
    assert.equal(
      node(g, "g-scene-prompt").data.text,
      buildTeleportScenePlatePrompt("Tokyo street at night", "9:16"),
    );
    assert.ok(wires(g).includes("g-scene-prompt>g-scene:prompt"));
    assert.ok(!g.nodes.some((n) => n.id === "g-mood"));
    assert.ok(!g.nodes.some((n) => n.type === "settings"));
    assert.equal(node(g, "g-render").data.prompt, "neon rain");
  });

  it("a blank drop leaves the scene port open", () => {
    const g = buildBlankTeleportGroup(ctx);
    assert.deepEqual(wires(g), ["g-render>g-grade:video", "g-trim>g-render:video"]);
    assert.equal(node(g, "g-render").data.modelId, "scro:teleport-render");
    assert.equal(node(g, "g-render").data.prompt, "");
    assert.ok(!g.nodes.some((n) => n.type === "media"));
  });
});

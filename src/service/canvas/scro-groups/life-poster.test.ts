import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEEDREAM_MODEL_ID } from "@/service/canvas/scro-groups/builder";
import { buildLifeGroup, buildLifePhotoPrompt } from "@/service/canvas/scro-groups/life";
import { buildPosterGroup } from "@/service/canvas/scro-groups/poster";
import { buildPostCreatePrompt } from "@/service/post/prompts";

const ctx = { idPrefix: "g", origin: { x: 0, y: 0 } };
const jim = { url: "https://x/jim.png", name: "Jim", mediaKind: "image" as const };
const mug = { url: "https://x/mug.png", name: "Mug", mediaKind: "image" as const };

describe("buildLifeGroup", () => {
  it("wires the character and template prompt into Seedream", () => {
    const group = buildLifeGroup(ctx, { character: jim, scene: "cafe at dusk", aspectRatio: "9:16" });
    assert.equal(group.nodes.length, 3);
    const image = group.nodes.find((n) => n.id === group.outputNodeId)!;
    assert.equal(image.data.modelId, SEEDREAM_MODEL_ID);
    assert.equal(image.data.aspectRatio, "9:16");
    assert.deepEqual(
      group.edges.map((e) => `${e.source}:${e.targetHandle}`).sort(),
      ["g-character:refImages", "g-prompt:prompt"],
    );
    const prompt = group.nodes.find((n) => n.id === "g-prompt")!;
    assert.match(prompt.data.text!, /Scene and mood: cafe at dusk\./);
  });

  it("falls back to a default scene", () => {
    assert.match(buildLifePhotoPrompt("  "), /Candid natural daylight lifestyle portrait/);
  });
});

describe("buildPosterGroup", () => {
  it("builds prompt-only posters", () => {
    const group = buildPosterGroup(ctx, { prompt: "Summer sale", aspectRatio: "1:1" });
    assert.equal(group.nodes.length, 2);
    const prompt = group.nodes.find((n) => n.type === "prompt")!;
    assert.equal(prompt.data.text, buildPostCreatePrompt({ prompt: "Summer sale", cast: [], products: [] }));
  });

  it("wires character then product as references", () => {
    const group = buildPosterGroup(ctx, {
      prompt: "Launch post",
      character: { ref: jim, name: "Jim" },
      product: { ref: mug, name: "Mug" },
      aspectRatio: "9:16",
    });
    assert.equal(group.nodes.length, 4);
    assert.deepEqual(
      group.edges.filter((e) => e.targetHandle === "refImages").map((e) => e.source),
      ["g-character", "g-product"],
    );
    const prompt = group.nodes.find((n) => n.type === "prompt")!;
    assert.match(prompt.data.text!, /Jim/);
    assert.match(prompt.data.text!, /Mug/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasModelSpec, CanvasPortSpec } from "@/service/canvas/catalog/model-catalog";
import { swapCandidates, swapNodeModel, swappedNodeData } from "@/service/canvas/core/model-swap";

function port(id: string, type: CanvasPortSpec["type"], maxConnections = 1): CanvasPortSpec {
  return {
    id,
    label: id,
    labels: { "zh-Hant": id, en: id },
    type,
    required: false,
    multiple: maxConnections > 1,
    maxConnections,
  };
}

function spec(id: string, category: CanvasModelSpec["category"], inputs: CanvasPortSpec[], extra: Partial<CanvasModelSpec> = {}): CanvasModelSpec {
  const outputType = category === "video" ? "video" : "image";
  return {
    id,
    provider: "openrouter",
    providerModelId: id,
    name: id,
    category,
    inputs,
    output: { id: "output", label: "out", labels: { "zh-Hant": "out", en: "out" }, type: outputType },
    presets: ["16:9"],
    defaultPresetId: "16:9",
    basePriceUsd: 0.1,
    available: true,
    ...extra,
  };
}

const vidA = spec("openrouter:vid-a", "video", [port("prompt", "text"), port("startImage", "image"), port("endImage", "image")], {
  supportsAspectRatio: true,
  maxDurationSeconds: 10,
});
const vidB = spec("openrouter:vid-b", "video", [port("prompt", "text"), port("startImage", "image")], {
  maxDurationSeconds: 6,
  minDurationSeconds: 4,
});
const img = spec("openrouter:img", "image", [port("prompt", "text"), port("refImages", "image", 4)]);
const hidden = spec("openrouter:vid-hidden", "video", [port("prompt", "text")], { hiddenInSidebar: true });
const tool = spec("scro:tts", "video", [port("prompt", "text")], { provider: "scro" });
const catalog = [vidA, vidB, img, hidden, tool];

describe("swapCandidates", () => {
  it("lists only visible models of the same kind", () => {
    assert.deepEqual(swapCandidates(vidA, catalog).map((s) => s.id), ["openrouter:vid-b"]);
    assert.deepEqual(swapCandidates(img, catalog), []);
    assert.deepEqual(swapCandidates(tool, catalog), []);
  });
});

describe("swappedNodeData", () => {
  it("drops unsupported fields, clamps duration, and clears a failure", () => {
    const out = swappedNodeData(
      { modelId: vidA.id, aspectRatio: "16:9", durationSeconds: 10, status: "failed", lastError: "HTTP 400" },
      vidB,
    );
    assert.equal(out.modelId, vidB.id);
    assert.equal(out.aspectRatio, undefined);
    assert.equal(out.durationSeconds, 6);
    assert.equal(out.status, "idle");
    assert.equal(out.lastError, undefined);
  });
});

describe("swapNodeModel", () => {
  it("keeps wires the new model accepts and drops the rest", () => {
    const nodes: CanvasNode[] = [
      { id: "p", type: "prompt", position: { x: 0, y: 0 }, data: { text: "go" } },
      { id: "s", type: "model", position: { x: 0, y: 0 }, data: { modelId: img.id, outputUrl: "https://x/s.png", status: "completed" } },
      { id: "e", type: "model", position: { x: 0, y: 0 }, data: { modelId: img.id, outputUrl: "https://x/e.png", status: "completed" } },
      { id: "v", type: "model", position: { x: 0, y: 0 }, data: { modelId: vidA.id } },
    ];
    const edges: CanvasEdge[] = [
      { id: "e1", source: "p", sourceHandle: "output", target: "v", targetHandle: "prompt" },
      { id: "e2", source: "s", sourceHandle: "output", target: "v", targetHandle: "startImage" },
      { id: "e3", source: "e", sourceHandle: "output", target: "v", targetHandle: "endImage" },
    ];
    const res = swapNodeModel({ nodes, edges, nodeId: "v", next: vidB, catalog });
    assert.ok(res);
    assert.equal(res.data.modelId, vidB.id);
    assert.deepEqual(res.edges.map((e) => e.id), ["e1", "e2"]);
    assert.deepEqual(res.droppedEdgeIds, ["e3"]);
  });
});

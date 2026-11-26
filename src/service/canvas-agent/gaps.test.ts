import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import {
  autofixCanvasAgentGaps,
  describeCanvasAgentGaps,
  findCanvasAgentGaps,
} from "@/service/canvas-agent/gaps";
import { CANVAS_AGENT_TOOL_HANDLERS as H, createWorkingGraph } from "@/service/canvas-agent/tools";

const SEEDREAM = "openrouter:bytedance-seed/seedream-5-0-pro";
const KREA_EDIT = "openrouter:krea/k3-edit";

function media(id: string, name: string): CanvasNode {
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: name, fileName: name, mediaKind: "image", mediaUrl: `https://x/${name}` },
  };
}

function graphWith(nodes: CanvasNode[]) {
  let i = 0;
  return createWorkingGraph({
    nodes,
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    nextId: () => `n${++i}`,
  });
}

describe("findCanvasAgentGaps", () => {
  it("flags a batch sibling that skipped the shared reference and autofix wires it", () => {
    const g = graphWith([media("media-bottle", "bottle.png")]);
    const wired = { promptText: "shot", wires: [{ sourceId: "media-bottle", targetPort: "refImages" }] };
    H.add_model_node(g, { modelId: SEEDREAM, ...wired });
    H.add_model_node(g, { modelId: SEEDREAM, ...wired });
    const missed = H.add_model_node(g, { modelId: SEEDREAM, promptText: "close-up" });

    const gaps = findCanvasAgentGaps(g);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0]!.nodeId, missed.nodeId);
    assert.equal(gaps[0]!.reason, "batch_reference");
    assert.deepEqual(gaps[0]!.candidates, ["media-bottle"]);

    assert.equal(autofixCanvasAgentGaps(g, gaps), 1);
    assert.ok(g.edges.some((e) => e.source === "media-bottle" && e.target === missed.nodeId));
    assert.deepEqual(findCanvasAgentGaps(g), []);
  });

  it("wires a required port when only one node can feed it", () => {
    const g = graphWith([media("media-a", "a.png")]);
    const edit = H.add_model_node(g, { modelId: KREA_EDIT, promptText: "make it red" });
    const gaps = findCanvasAgentGaps(g);
    assert.deepEqual(
      gaps.map((x) => [x.nodeId, x.port, x.reason, x.candidates]),
      [[edit.nodeId, "refImages", "required", ["media-a"]]],
    );
    assert.equal(autofixCanvasAgentGaps(g, gaps), 1);
    assert.deepEqual(findCanvasAgentGaps(g), []);
  });

  it("leaves a required port alone when several nodes could feed it", () => {
    const g = graphWith([media("media-a", "a.png"), media("media-b", "b.png")]);
    H.add_model_node(g, { modelId: KREA_EDIT, promptText: "make it red" });
    const gaps = findCanvasAgentGaps(g);
    assert.equal(gaps[0]!.candidates.length, 2);
    assert.equal(autofixCanvasAgentGaps(g, gaps), 0);
    assert.match(describeCanvasAgentGaps(g, gaps), /media-a \(a\.png\), media-b \(b\.png\)/);
  });

  it("counts an inline prompt and ignores nodes from earlier turns", () => {
    const old: CanvasNode = {
      id: "model-old",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: KREA_EDIT, prompt: "" },
    };
    const g = graphWith([old]);
    H.add_model_node(g, { modelId: SEEDREAM, prompt: "a fox" });
    assert.deepEqual(findCanvasAgentGaps(g), []);
  });
});

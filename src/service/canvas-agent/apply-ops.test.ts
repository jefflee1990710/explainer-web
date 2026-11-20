import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { applyCanvasAgentOp, applyCanvasAgentOps } from "@/service/canvas-agent/apply-ops";
import type { CanvasAgentGraph } from "@/service/canvas-agent/types";

const prompt: CanvasNode = {
  id: "p1",
  type: "prompt",
  position: { x: 0, y: 0 },
  data: { text: "a cat" },
};
const model: CanvasNode = {
  id: "m1",
  type: "model",
  position: { x: 400, y: 0 },
  data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", prompt: "" },
};
const edge: CanvasEdge = {
  id: "e1",
  source: "p1",
  sourceHandle: "output",
  target: "m1",
  targetHandle: "prompt",
};

function graph(): CanvasAgentGraph {
  return { nodes: [prompt, model], edges: [edge] };
}

describe("applyCanvasAgentOp", () => {
  it("adds a node and skips a duplicate id", () => {
    const fresh: CanvasNode = { ...prompt, id: "p2" };
    const added = applyCanvasAgentOp(graph(), { kind: "add_node", node: fresh });
    assert.equal(added.applied, true);
    assert.equal(added.graph.nodes.length, 3);

    const dup = applyCanvasAgentOp(graph(), { kind: "add_node", node: prompt });
    assert.equal(dup.applied, false);
    assert.equal(dup.graph.nodes.length, 2);
  });

  it("merges an update patch into node data", () => {
    const res = applyCanvasAgentOp(graph(), {
      kind: "update_node",
      nodeId: "m1",
      patch: { prompt: "neon city", aspectRatio: "9:16" },
    });
    assert.equal(res.applied, true);
    const m = res.graph.nodes.find((n) => n.id === "m1");
    assert.equal(m?.data.prompt, "neon city");
    assert.equal(m?.data.aspectRatio, "9:16");
    assert.equal(m?.data.modelId, model.data.modelId);
  });

  it("skips update and move for a missing node", () => {
    assert.equal(
      applyCanvasAgentOp(graph(), { kind: "update_node", nodeId: "x", patch: {} }).applied,
      false,
    );
    assert.equal(
      applyCanvasAgentOp(graph(), { kind: "move_node", nodeId: "x", position: { x: 1, y: 1 } })
        .applied,
      false,
    );
  });

  it("removes a node together with its edges", () => {
    const res = applyCanvasAgentOp(graph(), { kind: "remove_node", nodeId: "p1" });
    assert.equal(res.applied, true);
    assert.deepEqual(res.graph.nodes.map((n) => n.id), ["m1"]);
    assert.equal(res.graph.edges.length, 0);
  });

  it("skips an edge whose endpoint is missing", () => {
    const res = applyCanvasAgentOp(graph(), {
      kind: "add_edge",
      edge: { ...edge, id: "e2", source: "gone" },
    });
    assert.equal(res.applied, false);
  });

  it("skips a duplicate connection and appends a new one", () => {
    const dup = applyCanvasAgentOp(graph(), { kind: "add_edge", edge: { ...edge, id: "e9" } });
    assert.equal(dup.applied, false);

    const base = graph();
    base.nodes.push({ ...prompt, id: "p2" });
    const res = applyCanvasAgentOps(base, [
      { kind: "remove_edge", edgeId: "e1" },
      { kind: "add_edge", edge: { ...edge, id: "e2", source: "p2" } },
    ]);
    assert.equal(res.skipped, 0);
    assert.deepEqual(res.graph.edges.map((e) => e.id), ["e2"]);
  });

  it("moves a node and removes an edge", () => {
    const moved = applyCanvasAgentOp(graph(), {
      kind: "move_node",
      nodeId: "p1",
      position: { x: -50, y: 20 },
    });
    assert.deepEqual(moved.graph.nodes[0]?.position, { x: -50, y: 20 });

    const removed = applyCanvasAgentOp(graph(), { kind: "remove_edge", edgeId: "e1" });
    assert.equal(removed.applied, true);
    assert.equal(removed.graph.edges.length, 0);
    assert.equal(applyCanvasAgentOp(graph(), { kind: "remove_edge", edgeId: "zz" }).applied, false);
  });

  it("does not mutate the input graph", () => {
    const base = graph();
    applyCanvasAgentOp(base, { kind: "remove_node", nodeId: "p1" });
    assert.equal(base.nodes.length, 2);
    assert.equal(base.edges.length, 1);
  });
});

describe("applyCanvasAgentOps", () => {
  it("applies ops in order and counts skipped ones", () => {
    const res = applyCanvasAgentOps(graph(), [
      { kind: "remove_edge", edgeId: "e1" },
      { kind: "remove_edge", edgeId: "e1" },
      { kind: "update_node", nodeId: "p1", patch: { text: "a dog" } },
    ]);
    assert.equal(res.skipped, 1);
    assert.equal(res.graph.edges.length, 0);
    assert.equal(res.graph.nodes[0]?.data.text, "a dog");
  });
});

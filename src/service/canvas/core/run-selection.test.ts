import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { computeExecutionWaves } from "@/service/canvas/core/graph";
import { filterFlowWaves } from "@/service/canvas/execution/flow/run";
import { runnableNodeAndDependents } from "@/service/canvas/core/run-selection";

function model(id: string, modelId = "ffmpeg:trim-speed"): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data: { modelId, status: "idle" } };
}

function edge(source: string, target: string) {
  return { id: `${source}-${target}`, source, sourceHandle: "output", target, targetHandle: "video" };
}

describe("runnableNodeAndDependents", () => {
  it("includes this node and downstream models, not upstream or side branches", () => {
    const nodes = [model("u"), model("a"), model("b"), model("x")];
    const edges = [edge("u", "a"), edge("a", "b")];
    const ids = runnableNodeAndDependents(nodes, edges, "a");
    assert.deepEqual(ids, ["a", "b"]);
    const waves = filterFlowWaves(computeExecutionWaves(nodes, edges), ids);
    assert.deepEqual(waves.flat(), ["a", "b"]);
    assert.equal(waves.flat().includes("u"), false);
    assert.equal(waves.flat().includes("x"), false);
  });

  it("skips a director card sitting between two runnable nodes", () => {
    const director = model("dir", "scro:swap");
    director.data.toolParams = { directorMode: true };
    const nodes = [model("a"), director, model("b")];
    const edges = [edge("a", "dir"), edge("dir", "b")];
    assert.deepEqual(runnableNodeAndDependents(nodes, edges, "a"), ["a", "b"]);
  });
});

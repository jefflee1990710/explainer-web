import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { ExplainerDirectorPlan } from "@/service/canvas/explainer-director";
import { applyDirectorBuild, dropCutDirectorEdges } from "@/service/canvas/explainer-director-apply";

const node = (id: string): CanvasNode => ({ id, type: "model", position: { x: 0, y: 0 }, data: { modelId: "x" } });
const wire = (source: string, target: string, sourceHandle = "output"): CanvasEdge => ({
  id: `${source}:${sourceHandle}->${target}`,
  source,
  sourceHandle,
  target,
  targetHandle: "prompt",
});

describe("director graph apply", () => {
  it("build adds the rows and keeps everything else", () => {
    const out = applyDirectorBuild(
      { nodes: [node("dir"), node("keep")], edges: [] },
      { directorId: "dir", expansion: { nodes: [node("frame")], edges: [wire("dir", "frame", "clip-1-frame")] } },
    );
    assert.deepEqual(out.nodes.map((n) => n.id), ["dir", "keep", "frame"]);
    assert.equal(out.edges.length, 1);
    assert.deepEqual(out.removedIds, []);
  });

  it("rebuild removes the old group's members except the Director", () => {
    const graph = {
      nodes: [node("dir"), node("old-frame"), node("keep")],
      edges: [wire("dir", "old-frame", "clip-1-frame")],
    };
    const out = applyDirectorBuild(graph, {
      directorId: "dir",
      expansion: { nodes: [node("new-frame")], edges: [wire("dir", "new-frame", "clip-1-frame")] },
      replaceGroup: { id: "g", title: "t", color: "rose", kind: "explainer", memberIds: ["dir", "old-frame"] },
    });
    assert.deepEqual(out.nodes.map((n) => n.id).sort(), ["dir", "keep", "new-frame"]);
    assert.deepEqual(out.removedIds, ["old-frame"]);
    assert.deepEqual(out.edges.map((e) => e.target), ["new-frame"]);
  });

  it("keep drops wires from outputs the new plan no longer has", () => {
    const plan = {
      plannerVideoId: "v",
      plannedWith: {},
      clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "", spokenLine: "", durationSeconds: 6, refUrls: [] }],
    } as unknown as ExplainerDirectorPlan;
    const edges = [wire("dir", "f1", "clip-1-frame"), wire("dir", "f2", "clip-2-frame"), wire("x", "y")];
    const out = dropCutDirectorEdges(edges, "dir", plan);
    assert.deepEqual(out.edges.map((e) => e.target), ["f1", "y"]);
    assert.deepEqual(out.cutTargets, ["f2"]);
  });
});

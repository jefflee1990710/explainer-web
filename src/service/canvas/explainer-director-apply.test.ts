import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  applyDirectorBuild,
  directorRevealSteps,
  mergeDirectorRows,
} from "@/service/canvas/explainer-director-apply";

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

  it("merges the finished plan onto rows built while planning", () => {
    const placed = { ...node("frame"), position: { x: 500, y: 40 } };
    const out = mergeDirectorRows(
      { nodes: [node("dir"), placed], edges: [wire("dir", "video", "clip-1-motion")] },
      {
        nodes: [{ ...node("frame"), data: { modelId: "x", resolution: "2k" } }, node("ref")],
        edges: [wire("dir", "video", "clip-1-motion"), wire("dir", "frame", "clip-1-frame"), wire("ref", "frame")],
      },
    );
    const frame = out.nodes.find((n) => n.id === "frame")!;
    assert.deepEqual(frame.position, { x: 500, y: 40 });
    assert.equal(frame.data.resolution, "2k");
    assert.deepEqual(out.addedIds, ["ref"]);
    assert.equal(out.edges.length, 3);
  });

  it("reveals one node per step and each wire once both ends are placed", () => {
    const steps = directorRevealSteps(
      {
        nodes: [node("a"), node("b"), node("c")],
        edges: [wire("dir", "a", "clip-1-voice"), wire("a", "c"), wire("b", "c")],
      },
      ["dir"],
    );
    assert.deepEqual(steps.map((s) => s.node.id), ["a", "b", "c"]);
    assert.deepEqual(steps.map((s) => s.edges.map((e) => e.id)), [
      ["dir:clip-1-voice->a"],
      [],
      ["a:output->c", "b:output->c"],
    ]);
  });
});

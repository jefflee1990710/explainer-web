import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import {
  dropExpandedPlanners,
  isDirectorPlannerNode,
  isExplainerPlannerNode,
  readPlannerParams,
} from "@/service/canvas/explainer-planner";
import { computeExecutionWaves } from "@/service/canvas/graph";

const node = (data: CanvasNode["data"]): CanvasNode => ({
  id: "n1",
  type: "model",
  position: { x: 0, y: 0 },
  data,
});

describe("explainer planner helpers", () => {
  it("detects planner nodes only when plannerMode is true on scro:explainer", () => {
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:explainer", toolParams: { plannerMode: true } })), true);
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:explainer" })), false);
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:tts", toolParams: { plannerMode: true } })), false);
    assert.equal(isExplainerPlannerNode({ type: "prompt", data: { toolParams: { plannerMode: true } } }), false);
  });

  it("treats Talking Head with plannerMode as a director planner", () => {
    assert.equal(
      isDirectorPlannerNode(node({ modelId: "scro:talking-head", toolParams: { plannerMode: true } })),
      true,
    );
    assert.equal(isDirectorPlannerNode(node({ modelId: "scro:talking-head" })), false);
  });

  it("reads planner params defensively", () => {
    const params = readPlannerParams(
      node({
        modelId: "scro:explainer",
        toolParams: {
          plannerMode: true,
          plannerVideoId: "abc",
          planStatus: "planning",
          expandedNodeIds: ["a", 3, "b"],
        },
      }),
    );
    assert.deepEqual(params, {
      plannerVideoId: "abc",
      planStatus: "planning",
      expandedNodeIds: ["a", "b"],
      planError: undefined,
      planSummary: undefined,
    });
    assert.equal(readPlannerParams(node({ toolParams: { planStatus: "weird" } })).planStatus, undefined);
  });
});

describe("dropExpandedPlanners", () => {
  it("removes only already-expanded planners and their wires", () => {
    const planner = (id: string, planStatus?: string): CanvasNode => ({
      id,
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:explainer", toolParams: { plannerMode: true, planStatus } },
    });
    const out = dropExpandedPlanners({
      nodes: [planner("done", "expanded"), planner("busy", "planning"), planner("idle")],
      edges: [
        { id: "e1", source: "p", target: "done" },
        { id: "e2", source: "p", target: "busy" },
      ],
    });
    assert.deepEqual(out.nodes.map((n) => n.id), ["busy", "idle"]);
    assert.deepEqual(out.edges.map((e) => e.id), ["e2"]);
  });
});

describe("planner exclusion", () => {
  it("never schedules planner nodes in flow waves", () => {
    const nodes: CanvasNode[] = [
      node({ modelId: "scro:explainer", toolParams: { plannerMode: true } }),
      { id: "tts", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts", prompt: "hi" } },
    ];
    assert.deepEqual(computeExecutionWaves(nodes, []), [["tts"]]);
    assert.deepEqual(computeExecutionWaves(nodes, [], ["n1", "tts"]), [["tts"]]);
  });
});

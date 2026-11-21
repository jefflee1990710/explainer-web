import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { isExplainerPlannerNode, readPlannerParams } from "@/service/canvas/explainer-planner";

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

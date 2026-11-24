import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorChangedTargets,
  directorHandles,
  directorNeedsReplan,
  directorParams,
  directorRawOutput,
  isExplainerDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
  type ExplainerDirectorPlan,
} from "@/service/canvas/explainer-director";

function director(toolParams: Record<string, unknown> = {}, prompt = "How LLMs work"): CanvasNode {
  return {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt,
      aspectRatio: "9:16",
      toolParams: {
        plannerMode: true,
        skillSlug: "paper-cutout-explainer-video-director",
        textStyleId: "neon",
        ...toolParams,
      },
    },
  };
}

function plan(n: number, base: CanvasNode): ExplainerDirectorPlan {
  return {
    plannerVideoId: "v1",
    plannedWith: directorParams(base),
    clips: Array.from({ length: n }, (_, i) => ({
      clipNumber: i + 1,
      framePrompt: `still ${i + 1} {{text_style}}`,
      videoPrompt: `motion ${i + 1}`,
      spokenLine: `line ${i + 1}`,
      durationSeconds: 6,
      refUrls: [],
    })),
  };
}

describe("explainer director", () => {
  it("recognizes only planner-mode explainer nodes", () => {
    assert.equal(isExplainerDirectorNode(director()), true);
    const talking = { ...director(), data: { ...director().data, modelId: "scro:talking-head" } };
    assert.equal(isExplainerDirectorNode(talking), false);
  });

  it("reads a valid plan and lists three handles per clip", () => {
    const base = director();
    const node = director({ plan: plan(2, base) });
    assert.deepEqual(directorHandles(readDirectorPlan(node)!), [
      "clip-1-frame",
      "clip-1-motion",
      "clip-1-voice",
      "clip-2-frame",
      "clip-2-motion",
      "clip-2-voice",
    ]);
    assert.equal(readDirectorPlan(director({ plan: { clips: "bad" } })), undefined);
    assert.deepEqual(parseDirectorHandle("clip-12-voice"), { clipNumber: 12, kind: "voice" });
    assert.equal(parseDirectorHandle("output"), undefined);
  });

  it("returns each output's raw text", () => {
    const base = director();
    const node = director({ plan: plan(1, base) });
    assert.equal(directorRawOutput(node, "clip-1-frame"), "still 1 {{text_style}}");
    assert.equal(directorRawOutput(node, "clip-1-voice"), "line 1");
    assert.equal(directorRawOutput(node, "clip-9-voice"), undefined);
  });

  it("needs a replan when any parameter but the text style changed", () => {
    const base = director();
    const planned = director({ plan: plan(1, base) });
    assert.equal(directorNeedsReplan(planned), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), textStyleId: "chalk" })), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), presenterPosition: "lower-left" })), true);
    assert.equal(directorNeedsReplan({ ...planned, data: { ...planned.data, prompt: "New topic" } }), true);
    assert.equal(directorNeedsReplan(director()), false);
  });

  it("lists targets whose wired output text changed", () => {
    const base = director();
    const before = director({ plan: plan(1, base) });
    const after = director({ plan: plan(1, base), textStyleId: "chalk" });
    const edges: CanvasEdge[] = [
      { id: "a", source: "dir", sourceHandle: "clip-1-frame", target: "frame", targetHandle: "prompt" },
      { id: "b", source: "dir", sourceHandle: "clip-1-motion", target: "video", targetHandle: "prompt" },
    ];
    assert.deepEqual(directorChangedTargets(before, after, edges), ["frame"]);
  });
});

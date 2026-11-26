import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { directorParams, type ExplainerDirectorPlan } from "@/service/canvas/directors/explainer-director";
import { replanBeforeRun } from "@/service/canvas/directors/director-replan-run";

function director(toolParams: Record<string, unknown> = {}): CanvasNode {
  return {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt: "Topic",
      aspectRatio: "9:16",
      toolParams: { plannerMode: true, skillSlug: "papercraft-diorama-director", ...toolParams },
    },
  };
}

function planned(changes: Record<string, unknown> = {}): CanvasNode {
  const base = director({ directorBackgroundId: "cream" });
  const plan: ExplainerDirectorPlan = {
    plannerVideoId: "v1",
    plannedWith: directorParams(base),
    clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "m", spokenLine: "l", durationSeconds: 6, refUrls: [] }],
  };
  return director({ directorBackgroundId: "cream", plan, ...changes });
}

function model(id: string, outputUrl?: string): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data: { modelId: "x", ...(outputUrl ? { outputUrl } : {}) } };
}

const edges = [
  { source: "dir", target: "frame" },
  { source: "frame", target: "video" },
  { source: "dir", target: "tts" },
  { source: "video", target: "mux" },
];

describe("replanBeforeRun", () => {
  it("finds the changed Director upstream and lists the other previews below it", () => {
    const nodes = [planned({ directorBackgroundId: "cobalt" }), model("frame", "a"), model("video", "b"), model("tts"), model("mux", "c")];
    assert.deepEqual(replanBeforeRun(nodes, edges, "frame"), { directorId: "dir", affectedIds: ["video", "mux"] });
    // A node further down still finds the Director through the frame.
    assert.equal(replanBeforeRun(nodes, edges, "mux")?.directorId, "dir");
  });

  it("returns nothing when the Director is current", () => {
    const nodes = [planned(), model("frame", "a"), model("video", "b"), model("tts"), model("mux")];
    assert.equal(replanBeforeRun(nodes, edges, "frame"), undefined);
  });
});

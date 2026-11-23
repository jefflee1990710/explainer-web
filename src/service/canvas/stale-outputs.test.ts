import { explainerSettingsOf } from "@/service/canvas/settings/registry";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import {
  clearNodeOutput,
  clearStaleOutputs,
  downstreamNodeIds,
  isGenerationInputPatch,
  isOutputStale,
  markStaleOutputs,
  outdatedNodeReasons,
} from "@/service/canvas/stale-outputs";

const CLEARED_AT = "2026-11-23T08:00:00.000Z";

function model(id: string, data: CanvasNodeData = {}): CanvasNode {
  return {
    id,
    type: "model",
    position: { x: 0, y: 0 },
    data: { modelId: "x", status: "completed", outputUrl: `https://blob/${id}`, outputKind: "image", lastJobId: `job-${id}`, ...data },
  };
}

function edge(source: string, target: string): CanvasEdge {
  return { id: `${source}->${target}`, source, sourceHandle: "output", target, targetHandle: "video" };
}

const ref: CanvasNode = { id: "ref", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "image", mediaUrl: "https://blob/ref" } };

describe("stale outputs", () => {
  it("clears one node's output and stamps the clear time", () => {
    const data = clearNodeOutput(model("f").data, CLEARED_AT);
    assert.equal(data.status, "idle");
    assert.equal(data.outputUrl, undefined);
    assert.equal(data.outputKind, undefined);
    assert.equal(data.lastJobId, undefined);
    assert.equal(data.outputClearedAt, CLEARED_AT);
    assert.equal(data.modelId, "x");
    assert.ok(!("outputUrl" in data));
  });

  it("walks downstream from the changed nodes, including them", () => {
    const edges = [edge("ref", "f"), edge("f", "v"), edge("v", "m"), edge("voice", "m"), edge("m", "c")];
    assert.deepEqual(downstreamNodeIds(edges, ["f"]), ["f", "v", "m", "c"]);
  });

  it("clears frame, video, mux, and concat but leaves upstream and running nodes", () => {
    const nodes = [
      ref,
      model("f"),
      model("v"),
      model("voice"),
      model("m", { status: "running", outputUrl: undefined }),
      model("c"),
    ];
    const edges = [edge("ref", "f"), edge("f", "v"), edge("v", "m"), edge("voice", "m"), edge("m", "c")];
    const res = clearStaleOutputs(nodes, edges, ["f"], CLEARED_AT);
    assert.deepEqual(res.clearedIds, ["f", "v", "c"]);
    const byId = new Map(res.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get("f")?.data.outputUrl, undefined);
    assert.equal(byId.get("c")?.data.status, "idle");
    assert.equal(byId.get("voice")?.data.outputUrl, "https://blob/voice");
    assert.equal(byId.get("m")?.data.status, "running");
    assert.equal(byId.get("ref")?.data.mediaUrl, "https://blob/ref");
  });

  it("reports nothing for idle nodes that never produced output", () => {
    const nodes = [model("f", { status: "idle", outputUrl: undefined, outputKind: undefined, lastJobId: undefined })];
    const res = clearStaleOutputs(nodes, [], ["f"], CLEARED_AT);
    assert.deepEqual(res.clearedIds, []);
    assert.equal(res.nodes[0], nodes[0]);
  });

  it("clears a failed node so its error goes away", () => {
    const nodes = [model("f", { status: "failed", outputUrl: undefined, lastError: "boom" })];
    const res = clearStaleOutputs(nodes, [], ["f"], CLEARED_AT);
    assert.deepEqual(res.clearedIds, ["f"]);
    assert.equal(res.nodes[0]?.data.lastError, undefined);
  });

  it("treats prompt, toolParams, and media changes as input changes", () => {
    const data = model("f", { prompt: "a", toolParams: { ttsSpeed: 1 } }).data;
    assert.equal(isGenerationInputPatch(data, { prompt: "b" }), true);
    assert.equal(isGenerationInputPatch(data, { toolParams: { ttsSpeed: 1.25 } }), true);
    assert.equal(isGenerationInputPatch(data, { mediaUrl: "https://blob/new" }), true);
  });

  it("ignores status, output, and unchanged values", () => {
    const data = model("f", { prompt: "a", toolParams: { ttsSpeed: 1 } }).data;
    assert.equal(isGenerationInputPatch(data, { status: "running", lastJobId: "j2" }), false);
    assert.equal(isGenerationInputPatch(data, { outputUrl: "https://blob/x", status: "completed" }), false);
    assert.equal(isGenerationInputPatch(data, { prompt: "a", toolParams: { ttsSpeed: 1 } }), false);
    assert.equal(isGenerationInputPatch(data, { label: "renamed" }), false);
  });

  it("keeps old previews but marks them stale downstream, skipping running nodes", () => {
    const nodes = [ref, model("f"), model("v"), model("voice"), model("m", { status: "running" }), model("c")];
    const edges = [edge("ref", "f"), edge("f", "v"), edge("v", "m"), edge("voice", "m"), edge("m", "c")];
    const res = markStaleOutputs(nodes, edges, ["f"]);
    assert.deepEqual(res.staleIds, ["f", "v", "c"]);
    const byId = new Map(res.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get("f")?.data.outputUrl, "https://blob/f");
    assert.equal(isOutputStale(byId.get("f")!.data), true);
    assert.equal(isOutputStale(byId.get("voice")!.data), false);
    assert.equal(isOutputStale(byId.get("m")!.data), false);
  });

  it("a regenerated output (new URL) is no longer stale", () => {
    const stale = { ...model("f").data, staleOutputUrl: "https://blob/f" };
    assert.equal(isOutputStale(stale), true);
    assert.equal(isOutputStale({ ...stale, outputUrl: "https://blob/f-v2" }), false);
  });

  it("reports unapplied Explainer Settings edits on downstream nodes with output", () => {
    const applied = {
      skillSlug: "paper-cutout-explainer-video-director" as const,
      backgroundId: "wood-cardboard",
      textStyleId: "handwritten" as const,
      sceneTextLanguage: "zh-Hant" as const,
      presenterPosition: "auto" as const,
    };
    const settings: CanvasNode = {
      id: "s",
      type: "settings",
      position: { x: 0, y: 0 },
      data: { settings: { kind: "explainer", plannerVideoId: "v", topic: "t", applied, draft: { ...applied, backgroundId: "sky" } } },
    };
    const nodes = [settings, model("f"), model("v", { outputUrl: undefined }), model("x", { staleOutputUrl: "https://blob/x" })];
    const reasons = outdatedNodeReasons(nodes, [edge("s", "f"), edge("f", "v")]);
    assert.deepEqual([...reasons], [["f", "settings"], ["x", "inputs"]]);
    const clean = { ...settings, data: { settings: { kind: "explainer" as const, ...explainerSettingsOf(settings.data)!, draft: applied } } };
    assert.equal(outdatedNodeReasons([clean, model("f")], [edge("s", "f")]).size, 0);
  });
});

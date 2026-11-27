import { directorParams } from "@/service/canvas/directors/explainer-director";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import {
  clearNodeOutput,
  clearStaleOutputs,
  downstreamNodeIds,
  flowRerunNodeIds,
  applyRememberedJobOutput,
  isGenerationInputPatch,
  isOutputStale,
  markStaleOutputs,
  mergeFlowPollNodeData,
  outdatedNodeReasons,
} from "@/service/canvas/core/stale-outputs";

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
    const data = clearNodeOutput(
      model("f", { staleOutputUrl: "https://blob/f", lastError: "err", lastCostUsd: 0.12 }).data,
      CLEARED_AT,
    );
    assert.equal(data.status, "idle");
    assert.equal(data.outputUrl, undefined);
    assert.equal(data.outputKind, undefined);
    assert.equal(data.lastJobId, undefined);
    assert.equal(data.lastError, undefined);
    assert.equal(data.lastCostUsd, undefined);
    assert.equal(data.staleOutputUrl, undefined);
    assert.equal(data.outputClearedAt, CLEARED_AT);
    assert.equal(data.modelId, "x");
    assert.ok(!("outputUrl" in data));
    assert.ok(!("staleOutputUrl" in data));
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

  it("a flow regenerates an old preview and the finished nodes downstream of it", () => {
    const frame = model("f");
    frame.data.staleOutputUrl = frame.data.outputUrl;
    const nodes = [frame, model("voice"), model("v"), model("mux")];
    const edges = [edge("f", "v"), edge("v", "mux"), edge("voice", "mux")];
    assert.deepEqual(flowRerunNodeIds(nodes, edges).sort(), ["f", "mux", "v"]);
    // An id the canvas already shows as old is included even if the saved mark was dropped.
    const dropped = model("f");
    delete dropped.data.staleOutputUrl;
    assert.deepEqual(flowRerunNodeIds([dropped, model("v")], [edge("f", "v")], ["f"]).sort(), ["f", "v"]);
  });

  it("a completed rerun replaces the old clip and clears the old-version mark", () => {
    const data: CanvasNodeData = {
      modelId: "ffmpeg:concat",
      status: "completed",
      outputUrl: "https://blob/old.mp4",
      outputKind: "video",
      staleOutputUrl: "https://blob/old.mp4",
      lastJobId: "6740000000000000000000aa",
    };
    const next = applyRememberedJobOutput(data, {
      status: "completed",
      lastJobId: "6740000200000000000000bb",
      outputUrl: "https://blob/new.mp4",
      outputKind: "video",
    });
    assert.equal(next.outputUrl, "https://blob/new.mp4");
    assert.equal(next.staleOutputUrl, undefined);
    assert.equal(isOutputStale(next), false);
  });

  it("does not paint an older job over a newer rerun", () => {
    const data: CanvasNodeData = {
      modelId: "ffmpeg:concat",
      status: "completed",
      outputUrl: "https://blob/new.mp4",
      outputKind: "video",
      lastJobId: "6740000200000000000000bb",
    };
    const next = applyRememberedJobOutput(data, {
      status: "completed",
      lastJobId: "6740000000000000000000aa",
      outputUrl: "https://blob/old.mp4",
      outputKind: "video",
    });
    assert.equal(next.outputUrl, "https://blob/new.mp4");
    assert.equal(next.lastJobId, "6740000200000000000000bb");
  });

  it("keeps an old-version preview when the completed job is still that same file", () => {
    const data: CanvasNodeData = {
      modelId: "ffmpeg:concat",
      status: "completed",
      outputUrl: "https://blob/old.mp4",
      staleOutputUrl: "https://blob/old.mp4",
    };
    const next = applyRememberedJobOutput(data, {
      status: "completed",
      lastJobId: "6740000000000000000000aa",
      outputUrl: "https://blob/old.mp4",
      outputKind: "video",
    });
    assert.equal(next.outputUrl, "https://blob/old.mp4");
    assert.equal(isOutputStale(next), true);
  });

  it("does not resurrect a pre-reset job onto a cleared idle node", () => {
    const data: CanvasNodeData = {
      modelId: "ffmpeg:concat",
      status: "idle",
      outputClearedAt: CLEARED_AT,
    };
    const next = applyRememberedJobOutput(data, {
      status: "completed",
      lastJobId: "6740000000000000000000aa",
      outputUrl: "https://blob/old.mp4",
      outputKind: "video",
    });
    assert.equal(next.status, "idle");
    assert.equal(next.outputUrl, undefined);
    assert.equal(next.lastJobId, undefined);
  });

  it("a regenerated output (new URL) is no longer stale", () => {
    const stale = { ...model("f").data, staleOutputUrl: "https://blob/f" };
    assert.equal(isOutputStale(stale), true);
    assert.equal(isOutputStale({ ...stale, outputUrl: "https://blob/f-v2" }), false);
  });

  it("reports nodes downstream of a Director that needs a replan", () => {
    const planned: CanvasNode = {
      id: "dir",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:explainer", prompt: "Old", aspectRatio: "9:16", toolParams: { plannerMode: true } },
    };
    const plan = {
      plannerVideoId: "v",
      plannedWith: directorParams(planned),
      clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "m", spokenLine: "s", durationSeconds: 6, refUrls: [] }],
    };
    const withPlan = (prompt: string): CanvasNode => ({
      ...planned,
      data: { ...planned.data, prompt, toolParams: { ...planned.data.toolParams, plan } },
    });
    const nodes = [withPlan("New"), model("f"), model("v", { outputUrl: undefined }), model("x", { staleOutputUrl: "https://blob/x" })];
    const reasons = outdatedNodeReasons(nodes, [edge("dir", "f"), edge("f", "v")]);
    assert.deepEqual([...reasons], [["f", "settings"], ["x", "inputs"]]);
    assert.equal(outdatedNodeReasons([withPlan("Old"), model("f")], [edge("dir", "f")]).size, 0);
  });

  it("mergeFlowPollNodeData updates execution state without overwriting unsaved local edits", () => {
    const local: CanvasNodeData = {
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      prompt: "Unsaved new prompt typed by user",
      aspectRatio: "16:9",
      status: "running",
      lastJobId: "674000000000000000000001",
      outputUrl: "https://blob/old.png",
      staleOutputUrl: "https://blob/old.png",
    };
    const server: CanvasNodeData = {
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      prompt: "Stale prompt from DB",
      aspectRatio: "9:16",
      status: "completed",
      lastJobId: "674000000000000000000002",
      outputUrl: "https://blob/new.png",
      outputKind: "image",
      lastCostUsd: 0.135,
    };
    const merged = mergeFlowPollNodeData(local, server);
    assert.equal(merged.prompt, "Unsaved new prompt typed by user");
    assert.equal(merged.aspectRatio, "16:9");
    assert.equal(merged.status, "completed");
    assert.equal(merged.outputUrl, "https://blob/new.png");
    assert.equal(merged.staleOutputUrl, undefined);
  });

  it("mergeFlowPollNodeData brings back the Clean Speech cut report", () => {
    const local: CanvasNodeData = { modelId: "scro:clean-speech", status: "running", lastJobId: "674000000000000000000001" };
    const server: CanvasNodeData = {
      ...local,
      status: "completed",
      lastJobId: "674000000000000000000002",
      outputUrl: "https://blob/clean.mp4",
      text: "8.0s → 5.1s",
    };
    assert.equal(mergeFlowPollNodeData(local, server).text, "8.0s → 5.1s");
    assert.equal(mergeFlowPollNodeData({ ...local, modelId: "ffmpeg:trim-speed" }, server).text, undefined);
  });
});

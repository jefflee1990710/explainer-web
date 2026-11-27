import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { resolveNodeInputs, validateEdgeConnection } from "@/service/canvas/core/graph";

const model = (id: string, modelId: string, outputUrl?: string): CanvasNode => ({
  id,
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId, status: outputUrl ? "completed" : "idle", ...(outputUrl ? { outputUrl } : {}) },
});
const audio = (id: string): CanvasNode => ({
  id,
  type: "media",
  position: { x: 0, y: 0 },
  data: { mediaKind: "audio", mediaUrl: `https://b.example/${id}.mp3` },
});
const edge = (source: string, target: string, targetHandle: string, sourceHandle = "output"): CanvasEdge => ({
  id: `${source}-${sourceHandle}-${target}`,
  source,
  sourceHandle,
  target,
  targetHandle,
});

describe("extra outputs and audio joins", () => {
  it("reads Split part B from its derived url", () => {
    const nodes = [model("split", "ffmpeg:split", "https://b.example/canvas/u/j.mp4"), model("fade", "ffmpeg:fade")];
    const resolved = resolveNodeInputs("fade", nodes, [edge("split", "fade", "video", "video-b")]);
    assert.equal(resolved.inputs.video, "https://b.example/canvas/u/j-video-b.mp4");
  });

  it("accepts the extra handle and rejects an unknown one", () => {
    const nodes = [model("split", "ffmpeg:split"), model("concat", "ffmpeg:concat")];
    const ok = validateEdgeConnection(nodes, [edge("split", "concat", "videos")], {
      source: "split",
      sourceHandle: "video-b",
      target: "concat",
      targetHandle: "videos",
    });
    assert.equal(ok.valid, true);
    const bad = validateEdgeConnection(nodes, [], { source: "split", sourceHandle: "video-c", target: "concat", targetHandle: "videos" });
    assert.equal(bad.valid, false);
  });

  it("resolves audio-concat tracks in edge order and requires one", () => {
    const nodes = [audio("a"), audio("b"), model("join", "ffmpeg:audio-concat")];
    const resolved = resolveNodeInputs("join", nodes, [edge("b", "join", "audios"), edge("a", "join", "audios")]);
    assert.deepEqual(resolved.inputs.audios, ["https://b.example/b.mp3", "https://b.example/a.mp3"]);
    const empty = resolveNodeInputs("join", nodes, []);
    assert.ok(!empty.ok && empty.missingRequiredFields.includes("audios"));
  });
});

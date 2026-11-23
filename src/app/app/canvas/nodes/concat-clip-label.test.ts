import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { concatClipLabel } from "@/app/app/canvas/nodes/concat-clip-label";

function modelNode(id: string, modelId: string, prompt?: string): CanvasNode {
  return {
    id,
    type: "model",
    position: { x: 0, y: 0 },
    data: { modelId, ...(prompt ? { prompt } : {}) },
  };
}

function edge(id: string, source: string, target: string, targetHandle: string): CanvasEdge {
  return { id, source, sourceHandle: "output", target, targetHandle };
}

describe("concatClipLabel", () => {
  it("uses an upstream spoken line when the wired node has no name of its own", () => {
    const nodes = [
      modelNode(
        "vid",
        "minimax",
        "SILENT ON-SCREEN CHARACTER: nobody speaks\n100% locked stationary square-on camera",
      ),
      modelNode("tts", "scro:tts", "創業者成日講「搞緊啦」"),
      modelNode("mux", "ffmpeg:audio-mux"),
    ];
    const edges = [
      edge("a", "vid", "mux", "video"),
      edge("b", "tts", "mux", "refAudio"),
    ];

    assert.equal(
      concatClipLabel({
        sourceId: "mux",
        nodes,
        edges,
        index: 0,
        isZh: true,
        modelName: () => "FFmpeg Audio Mux",
      }),
      "創業者成日講「搞緊啦」",
    );
  });

  it("falls back to the model name when nothing upstream is named", () => {
    const nodes = [modelNode("mux", "ffmpeg:audio-mux")];
    assert.equal(
      concatClipLabel({
        sourceId: "mux",
        nodes,
        edges: [],
        index: 2,
        isZh: false,
        modelName: () => "FFmpeg Audio Mux",
      }),
      "FFmpeg Audio Mux",
    );
  });
});

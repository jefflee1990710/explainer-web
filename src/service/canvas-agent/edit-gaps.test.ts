import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { describeCanvasAgentGaps, findCanvasAgentGaps } from "@/service/canvas-agent/gaps";
import { CANVAS_AGENT_TOOL_HANDLERS as H } from "@/service/canvas-agent/tools";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";

function clip(id: string, meta: Omit<CanvasMediaMeta, "url">): CanvasNode {
  const url = `https://x.public.blob.vercel-storage.com/${id}.mp4`;
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: id, fileName: `${id}.mp4`, mediaKind: "video", mediaUrl: url, outputMeta: { url, ...meta } },
  };
}

function graphWith(nodes: CanvasNode[]) {
  let i = 0;
  return createWorkingGraph({ nodes, edges: [], catalog: STATIC_CANVAS_MODELS, assets: [], nextId: () => `n${++i}` });
}

function addEdit(g: ReturnType<typeof graphWith>, modelId: string, sourceId: string, toolParams: Record<string, unknown>) {
  const res = H.add_model_node(g, { modelId, toolParams, wires: [{ sourceId, targetPort: "video" }] });
  assert.ok("nodeId" in res, JSON.stringify(res));
  return (res as { nodeId: string }).nodeId;
}

const editGaps = (g: ReturnType<typeof graphWith>) => findCanvasAgentGaps(g).filter((gap) => gap.reason === "edit");

describe("edit gaps", () => {
  it("flags a trim that ends after the source", () => {
    const g = graphWith([clip("talk", { durationSec: 8, hasAudio: true })]);
    const id = addEdit(g, "ffmpeg:trim-speed", "talk", { ffmpegStartSec: 2, ffmpegEndSec: 12 });
    const gaps = editGaps(g);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0]!.nodeId, id);
    assert.equal(gaps[0]!.port, "ffmpegEndSec");
    assert.match(describeCanvasAgentGaps(g, gaps), /ends at 12s but the source is only 8s long/);
    H.update_node(g, { nodeId: id, toolParams: { ffmpegEndSec: 8 } });
    assert.deepEqual(editGaps(g), []);
  });

  it("flags keep-ranges past the end and unreadable ranges", () => {
    const g = graphWith([clip("talk", { durationSec: 10, hasAudio: true })]);
    addEdit(g, "ffmpeg:keep-ranges", "talk", { ffmpegRanges: "0-3, 8-14" });
    addEdit(g, "ffmpeg:keep-ranges", "talk", { ffmpegRanges: "abc" });
    const messages = editGaps(g).map((gap) => gap.message);
    assert.equal(messages.length, 2);
    assert.match(messages[0]!, /past the source's 10s end/);
    assert.match(messages[1]!, /abc/);
  });

  it("flags sound edits on a silent source", () => {
    const g = graphWith([clip("silent", { durationSec: 5, hasAudio: false })]);
    addEdit(g, "ffmpeg:volume", "silent", { ffmpegVolumeMode: "gain", ffmpegAudioGainDb: 6 });
    addEdit(g, "ffmpeg:audio-fade", "silent", {});
    assert.equal(editGaps(g).filter((gap) => /has no sound/.test(gap.message ?? "")).length, 2);
  });

  it("estimates through an unrun chain: fade longer than the trimmed clip", () => {
    const g = graphWith([clip("talk", { durationSec: 20, hasAudio: true })]);
    const trim = addEdit(g, "ffmpeg:trim-speed", "talk", { ffmpegStartSec: 0, ffmpegEndSec: 2 });
    addEdit(g, "ffmpeg:fade", trim, { ffmpegFadeInSec: 1.5, ffmpegFadeOutSec: 1.5 });
    const gaps = editGaps(g);
    assert.equal(gaps.length, 1);
    assert.match(gaps[0]!.message!, /fades total 3s but the source is only 2s long/);
  });

  it("does not flag when the source length is unknown", () => {
    const g = graphWith([clip("x", {})]);
    addEdit(g, "ffmpeg:trim-speed", "x", { ffmpegStartSec: 100 });
    assert.deepEqual(editGaps(g), []);
  });

  it("flags concat clips with different frame shapes", () => {
    const g = graphWith([
      clip("tall", { durationSec: 4, hasAudio: true, width: 720, height: 1280 }),
      clip("wide", { durationSec: 4, hasAudio: true, width: 1280, height: 720 }),
    ]);
    H.add_model_node(g, {
      modelId: "ffmpeg:concat",
      wires: [
        { sourceId: "tall", targetPort: "videos" },
        { sourceId: "wide", targetPort: "videos" },
      ],
    });
    assert.match(editGaps(g)[0]!.message!, /mixes frame shapes/);
  });
});

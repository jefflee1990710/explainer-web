import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { expectedNodeMedia } from "@/service/canvas/core/edit-media";
import { readSequence } from "@/service/canvas/core/sequence";
import { applyCanvasAgentOps } from "@/service/canvas-agent/apply-ops";
import { findCanvasAgentEditIssues } from "@/service/canvas-agent/edit-gaps";
import { SEQUENCE_TOOL_HANDLERS as S } from "@/service/canvas-agent/sequence-tools";
import { CANVAS_AGENT_TOOL_HANDLERS as H } from "@/service/canvas-agent/tools";
import { createWorkingGraph, describeNode } from "@/service/canvas-agent/working-graph";
import { buildExplainerExpansion } from "@/service/canvas/directors/explainer-expand";

function media(id: string, kind: "video" | "audio" | "image", meta: Omit<CanvasMediaMeta, "url">): CanvasNode {
  const url = `https://x.public.blob.vercel-storage.com/${id}.${kind === "video" ? "mp4" : kind === "audio" ? "mp3" : "png"}`;
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: id, fileName: id, mediaKind: kind, mediaUrl: url, outputMeta: { url, ...meta } },
  };
}

function graph() {
  let i = 0;
  const initial = [
    media("c1", "video", { durationSec: 6, hasAudio: true }),
    media("c2", "video", { durationSec: 8, hasAudio: true }),
    media("c3", "video", { durationSec: 4, hasAudio: true }),
    media("song", "audio", { durationSec: 30, hasAudio: true }),
    media("logo", "image", {}),
  ];
  const g = createWorkingGraph({
    nodes: initial,
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    nextId: () => `n${++i}`,
  });
  return { g, initial };
}

describe("canvas agent sequence tools", () => {
  it("build_sequence wires clips in order with trims and joins, and reports the length", () => {
    const { g } = graph();
    const res = S.build_sequence(g, H, {
      clips: [
        { source: "c1", outSec: 4 },
        { source: "c2", speed: 2, transition: "fade", transitionSec: 1 },
      ],
      aspectRatio: "16:9",
    });
    assert.equal(res.error, undefined);
    const nodeId = res.nodeId as string;
    const node = g.nodes.find((n) => n.id === nodeId)!;
    assert.equal(node.data.modelId, SEQUENCE_MODEL_ID);
    const seq = readSequence(node.data.toolParams);
    assert.equal(seq.aspectRatio, "16:9");
    assert.deepEqual(
      seq.tracks.video.map((c) => [g.edges.find((e) => e.id === c.ref)?.source, c.outSec, c.speed, c.transitionIn?.effect]),
      [
        ["c1", 4, 1, undefined],
        ["c2", undefined, 2, "fade"],
      ],
    );
    // 4 + 8/2 - 1s crossfade.
    assert.equal((res.timeline as { totalSec: number }).totalSec, 7);
    assert.equal(expectedNodeMedia(g, nodeId)?.durationSec, 7);
    assert.equal((describeNode(g, node) as { timeline?: unknown }).timeline !== undefined, true);
  });

  it("update_sequence adds music, a logo, and a title, and drops left-out clips' wires", () => {
    const { g } = graph();
    const nodeId = S.build_sequence(g, H, { clips: [{ source: "c1" }, { source: "c2" }, { source: "c3" }] }).nodeId as string;
    const res = S.update_sequence(g, H, {
      nodeId,
      clips: [{ source: "c3" }, { source: "c1", inSec: 1 }],
      layers: [
        { kind: "text", text: "Hello", startSec: 0, endSec: 2 },
        { kind: "image", source: "logo", x: 80, y: 4, scalePct: 15 },
      ],
      audio: [{ source: "song", gainDb: -12, duck: true, loop: true }],
      captions: { look: "bold" },
    });
    assert.equal(res.error, undefined);
    const seq = readSequence(g.nodes.find((n) => n.id === nodeId)!.data.toolParams);
    const srcOf = (ref?: string) => g.edges.find((e) => e.id === ref)?.source;
    assert.deepEqual(seq.tracks.video.map((c) => srcOf(c.ref)), ["c3", "c1"]);
    assert.ok(!g.edges.some((e) => e.source === "c2" && e.target === nodeId));
    assert.deepEqual(seq.tracks.overlay.map((l) => [l.kind, l.text ?? srcOf(l.ref)]), [["text", "Hello"], ["image", "logo"]]);
    assert.equal(g.edges.find((e) => e.source === "logo")?.targetHandle, "refImages");
    assert.deepEqual([srcOf(seq.tracks.audio[0]!.ref), seq.tracks.audio[0]!.duck], ["song", true]);
    assert.equal(seq.tracks.captions?.look, "bold");
  });

  it("build_sequence from a concat replays to the same graph on the client", () => {
    const { g, initial } = graph();
    const concat = H.add_model_node(g, {
      modelId: "ffmpeg:concat",
      toolParams: { ffmpegTransition: "dissolve", ffmpegTransitionSec: 0.5 },
      wires: ["c1", "c2"].map((sourceId) => ({ sourceId, targetPort: "videos" })),
    }).nodeId as string;
    const exportId = H.add_model_node(g, { modelId: "ffmpeg:export", wires: [{ sourceId: concat, targetPort: "video" }] }).nodeId as string;
    const res = S.build_sequence(g, H, { fromConcatId: concat });
    assert.equal(res.error, undefined);
    const seqId = res.nodeId as string;
    assert.ok(!g.nodes.some((n) => n.id === concat));
    assert.ok(g.edges.some((e) => e.source === seqId && e.target === exportId));
    const replayed = applyCanvasAgentOps({ nodes: initial, edges: [] }, g.ops).graph;
    assert.deepEqual(replayed.nodes.map((n) => n.id).sort(), g.nodes.map((n) => n.id).sort());
    assert.deepEqual(replayed.edges.map((e) => e.id).sort(), g.edges.map((e) => e.id).sort());
    assert.equal(readSequence(g.nodes.find((n) => n.id === seqId)!.data.toolParams).tracks.video[1]!.transitionIn?.effect, "dissolve");
  });

  it("flags an in point past the source end", () => {
    const { g } = graph();
    S.build_sequence(g, H, { clips: [{ source: "c3", inSec: 9 }] });
    const issues = findCanvasAgentEditIssues(g);
    assert.ok(issues.some((i) => i.field === "timeline.inSec" && /only 4s/.test(i.message)));
  });

  it("rejects a non-sequence node and unknown sources", () => {
    const { g } = graph();
    assert.match(String(S.update_sequence(g, H, { nodeId: "c1" }).error), /not an ffmpeg:sequence/);
    const res = S.build_sequence(g, H, { clips: [{ source: "c1" }, { source: "ghost" }] });
    assert.match(String(res.error), /ghost/);
  });

  it("set_director_finish swaps a built Director's Concat chain for one Sequence via replayable ops", () => {
    const rows = buildExplainerExpansion({
      idPrefix: "exp-a",
      origin: { x: 0, y: 0 },
      aspectRatio: "9:16",
      language: "en",
      voicePreset: "bella",
      directorId: "dir",
      clips: [1, 2, 3].map((n) => ({ clipNumber: n, framePrompt: "f", videoPrompt: "v", durationSeconds: 6, spokenLine: "l" })),
    });
    const director: CanvasNode = {
      id: "dir",
      type: "model",
      position: { x: -400, y: 0 },
      data: { modelId: "scro:explainer", toolParams: { plannerMode: true } },
    };
    const initial = { nodes: [director, ...rows.nodes], edges: rows.edges };
    const g = createWorkingGraph({
      ...initial,
      groups: [{ id: "exp-a", kind: "explainer", title: "Explainer", color: "lime", memberIds: initial.nodes.map((n) => n.id) }],
      catalog: STATIC_CANVAS_MODELS,
      assets: [],
      nextId: () => "x",
    });
    const res = S.set_director_finish(g, H, { directorId: "dir", finishWith: "sequence" });
    assert.equal(res.ok, true);
    assert.equal(res.outputId, "exp-a-sequence");
    const replayed = applyCanvasAgentOps(initial, g.ops).graph;
    assert.ok(!replayed.nodes.some((n) => n.data.modelId === "ffmpeg:concat"));
    assert.equal(replayed.edges.filter((e) => e.target === "exp-a-sequence").length, 3);
    assert.equal(replayed.nodes.find((n) => n.id === "dir")!.data.toolParams?.finishWith, "sequence");
    assert.equal(S.set_director_finish(g, H, { directorId: "exp-a-mux-1", finishWith: "concat" }).ok, undefined);
  });
});

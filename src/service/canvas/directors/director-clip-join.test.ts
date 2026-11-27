import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { readSequence, syncSequenceWithEdges } from "@/service/canvas/core/sequence";
import { buildExplainerExpansion } from "@/service/canvas/directors/explainer-expand";
import { builtClipJoin, switchDirectorClipJoin } from "@/service/canvas/directors/director-clip-join";
import { buildTalkingHeadExpansion } from "@/service/canvas/scro-groups/talking-head";
import { readClipJoin } from "@/service/canvas/scro-groups/clip-join";

const clips = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    clipNumber: i + 1,
    framePrompt: `frame ${i + 1}`,
    videoPrompt: `video ${i + 1}`,
    durationSeconds: 6,
    spokenLine: `line ${i + 1}`,
  }));

const explainer = (n: number, clipJoin?: "concat" | "sequence") =>
  buildExplainerExpansion({
    idPrefix: "exp-a",
    origin: { x: 0, y: 0 },
    aspectRatio: "16:9",
    language: "en",
    voicePreset: "bella",
    directorId: "dir",
    clips: clips(n),
    ...(clipJoin ? { clipJoin } : {}),
  });

const thInput = (n: number) => ({
  idPrefix: "th-a",
  origin: { x: 0, y: 0 },
  aspectRatio: "9:16" as const,
  language: "yue" as const,
  voicePreset: "alan",
  framing: "collarbone-close",
  framePrompt: "still",
  clips: Array.from({ length: n }, (_, i) => ({ clipNumber: i + 1, spokenLine: `l${i}`, heygenPrompt: `h${i}` })),
});

// A built Director group plus one node wired after the final output.
function canvas(expansion: { nodes: CanvasNode[]; edges: CanvasEdge[] }, outputId: string) {
  const director: CanvasNode = {
    id: "dir",
    type: "model",
    position: { x: -400, y: 0 },
    data: { modelId: "scro:explainer", aspectRatio: "16:9", toolParams: { plannerMode: true } },
  };
  const after: CanvasNode = {
    id: "burn",
    type: "model",
    position: { x: 2000, y: 0 },
    data: { modelId: "ffmpeg:burn-subtitles", outputUrl: "https://old.mp4" },
  };
  const group: CanvasGroup = {
    id: "exp-a",
    title: "Explainer",
    color: "lime",
    memberIds: ["dir", ...expansion.nodes.map((n) => n.id)],
  } as CanvasGroup;
  return {
    nodes: [director, ...expansion.nodes, after],
    edges: [
      ...expansion.edges,
      { id: `${outputId}->burn:video`, source: outputId, sourceHandle: "output", target: "burn", targetHandle: "video" },
    ],
    groups: [group],
  };
}

describe("clip join", () => {
  it("reads the Director param, defaulting to concat", () => {
    assert.equal(readClipJoin(undefined), "concat");
    assert.equal(readClipJoin({ finishWith: "sequence" }), "sequence");
    assert.equal(readClipJoin({ finishWith: "other" }), "concat");
  });

  it("ends Explainer rows in one Sequence whose clips point at their wires", () => {
    const out = explainer(9, "sequence");
    assert.equal(out.nodes.filter((n) => n.data.modelId === "ffmpeg:concat").length, 0);
    const seq = out.nodes.find((n) => n.id === "exp-a-sequence")!;
    assert.equal(seq.data.modelId, SEQUENCE_MODEL_ID);
    assert.equal(seq.data.status, "idle");
    const doc = readSequence(seq.data.toolParams);
    assert.equal(doc.aspectRatio, "16:9");
    const wires = out.edges.filter((e) => e.target === seq.id);
    assert.deepEqual(wires.map((e) => e.targetHandle), Array(9).fill("videos"));
    assert.deepEqual(doc.tracks.video.map((c) => c.ref), wires.map((e) => e.id));
    // Already in sync: nothing to append or drop.
    assert.deepEqual(syncSequenceWithEdges(doc, seq.id, out.edges).tracks.video.map((c) => c.ref), doc.tracks.video.map((c) => c.ref));
  });

  it("keeps the Concat chain by default", () => {
    const out = explainer(9);
    assert.equal(out.nodes.filter((n) => n.data.modelId === "ffmpeg:concat").length, 2);
    assert.ok(!out.nodes.some((n) => n.id === "exp-a-sequence"));
  });

  it("gives a single Talking Head clip a Sequence only when asked", () => {
    assert.ok(!buildTalkingHeadExpansion(thInput(1)).nodes.some((n) => n.data.modelId === SEQUENCE_MODEL_ID));
    const one = buildTalkingHeadExpansion({ ...thInput(1), clipJoin: "sequence" });
    assert.ok(one.edges.some((e) => e.source === "th-a-grade-1" && e.target === "th-a-sequence"));
    const three = buildTalkingHeadExpansion({ ...thInput(3), clipJoin: "sequence" });
    assert.equal(three.nodes.filter((n) => n.data.modelId === "ffmpeg:concat").length, 0);
    assert.equal(three.edges.filter((e) => e.target === "th-a-sequence").length, 3);
  });

  it("switches built rows from Concat to Sequence and back, keeping downstream wires", () => {
    const built = canvas(explainer(9), "exp-a-concat-2");
    assert.equal(builtClipJoin(built, "dir"), "concat");
    const toSeq = switchDirectorClipJoin(built, "dir", "sequence")!;
    assert.deepEqual(toSeq.removedIds.sort(), ["exp-a-concat-1", "exp-a-concat-2"]);
    assert.deepEqual(toSeq.addedIds, ["exp-a-sequence"]);
    assert.equal(toSeq.nodes.find((n) => n.id === "dir")!.data.toolParams?.finishWith, "sequence");
    assert.ok(toSeq.edges.some((e) => e.source === "exp-a-sequence" && e.target === "burn"));
    assert.ok(!toSeq.edges.some((e) => e.source.includes("concat") || e.target.includes("concat")));
    assert.ok(toSeq.groups[0]!.memberIds.includes("exp-a-sequence"));
    assert.equal(builtClipJoin(toSeq, "dir"), "sequence");
    assert.equal(switchDirectorClipJoin(toSeq, "dir", "sequence"), null);

    const back = switchDirectorClipJoin(toSeq, "dir", "concat")!;
    assert.deepEqual(back.addedIds, ["exp-a-concat-1", "exp-a-concat-2"]);
    assert.ok(back.edges.some((e) => e.source === "exp-a-concat-2" && e.target === "burn"));
    assert.equal(back.edges.filter((e) => e.target === "exp-a-concat-1").length, 8);
  });

  it("switches a single Talking Head clip without dropping its group wires", () => {
    const th = buildTalkingHeadExpansion(thInput(1));
    const built = canvas(th, "th-a-grade-1");
    built.groups[0]!.id = "th-a";
    const toSeq = switchDirectorClipJoin(built, "dir", "sequence")!;
    assert.equal(toSeq.outputId, "th-a-sequence");
    assert.ok(toSeq.edges.some((e) => e.source === "th-a-grade-1" && e.target === "th-a-sequence"));
    assert.ok(toSeq.edges.some((e) => e.source === "th-a-sequence" && e.target === "burn"));
    // The grade still gets its input from smooth-silence.
    assert.ok(toSeq.edges.some((e) => e.target === "th-a-grade-1"));
    const back = switchDirectorClipJoin(toSeq, "dir", "concat")!;
    assert.equal(back.outputId, "th-a-grade-1");
    assert.deepEqual(back.addedIds, []);
    assert.ok(back.edges.some((e) => e.source === "th-a-grade-1" && e.target === "burn"));
  });

  it("only sets the param before the rows are built", () => {
    const empty = canvas({ nodes: [], edges: [] }, "dir");
    assert.equal(switchDirectorClipJoin(empty, "dir", "sequence"), null);
  });
});

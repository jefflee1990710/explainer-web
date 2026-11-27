import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { canvasSequenceSchema, SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import {
  applyConcatToSequence,
  audioItemSec,
  placeClips,
  planConcatToSequence,
  readSequence,
  sequenceFrameSize,
  sequenceIssues,
  sequenceTotalSec,
  syncSequenceWithEdges,
} from "@/service/canvas/core/sequence";

const seq = (tracks: unknown, extra: Record<string, unknown> = {}) => canvasSequenceSchema.parse({ ...extra, tracks });
const edge = (id: string, source: string, target: string, targetHandle: string, sourceHandle = "output"): CanvasEdge => ({
  id,
  source,
  sourceHandle,
  target,
  targetHandle,
});
const model = (id: string, modelId: string, toolParams?: Record<string, unknown>): CanvasNode => ({
  id,
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId, status: "idle", ...(toolParams ? { toolParams } : {}) },
});

describe("sequence timeline", () => {
  it("places clips with speed, trims, and transition overlaps", () => {
    const s = seq({
      video: [
        { id: "a", ref: "e1", inSec: 1, outSec: 4 },
        { id: "b", ref: "e2", speed: 2, transitionIn: { effect: "fade", durationSec: 0.5 } },
        { id: "c", ref: "e3", transitionIn: { effect: "dissolve", durationSec: 2 } },
      ],
    });
    const placed = placeClips(s, { e1: 10, e2: 5, e3: 1 });
    assert.deepEqual(
      placed.map((p) => [p.start, p.end, p.transitionSec]),
      [
        [0, 3, 0],
        [2.5, 5, 0.5],
        // Transition capped at half the shorter neighbour (1s clip → 0.5s).
        [4.5, 5.5, 0.5],
      ],
    );
    assert.equal(sequenceTotalSec(s, { e1: 10, e2: 5, e3: 1 }), 5.5);
  });

  it("sizes frames by aspect and resolution", () => {
    assert.deepEqual(sequenceFrameSize({ aspectRatio: "9:16", resolution: "1080p" }), { width: 1080, height: 1920 });
    assert.deepEqual(sequenceFrameSize({ aspectRatio: "16:9", resolution: "720p" }), { width: 1280, height: 720 });
    assert.deepEqual(sequenceFrameSize({ aspectRatio: "4:5", resolution: "1080p" }), { width: 1080, height: 1350 });
  });

  it("caps audio items at the timeline end and loops to fill", () => {
    const item = canvasSequenceSchema.shape.tracks.parse({ audio: [{ id: "m", ref: "e", startSec: 2, inSec: 1 }] }).audio[0]!;
    assert.equal(audioItemSec(item, 30, 10), 8);
    assert.equal(audioItemSec(item, 4, 10), 3);
    assert.equal(audioItemSec({ ...item, loop: true }, 4, 10), 8);
  });

  it("reports out-of-range trims, empty text, and the length cap", () => {
    const s = seq({
      video: [
        { id: "a", ref: "e1", inSec: 12 },
        { id: "b", ref: "e2", outSec: 9 },
      ],
      overlay: [{ id: "t", kind: "text", text: " " }],
    });
    const fields = sequenceIssues(s, { e1: 10, e2: 5 }).map((i) => `${i.itemId}:${i.field}`);
    assert.ok(fields.includes("a:inSec"));
    assert.ok(fields.includes("b:outSec"));
    assert.ok(fields.includes("t:text"));
    const long = seq({ video: [{ id: "a", ref: "e1" }] }, { resolution: "4k" });
    assert.match(sequenceIssues(long, { e1: 400 }).map((i) => i.message).join(), /4K/);
  });

  it("falls back to an empty document when toolParams are missing or invalid", () => {
    assert.equal(readSequence(undefined).tracks.video.length, 0);
    assert.equal(readSequence({ sequence: { tracks: { video: "nope" } } }).aspectRatio, "9:16");
  });
});

describe("syncSequenceWithEdges", () => {
  let n = 0;
  const newId = (p: string) => `${p}-${++n}`;

  it("appends new wires, drops removed ones, and rebinds a recreated wire", () => {
    const s = seq({
      video: [
        { id: "a", ref: "old-1", src: "v1:output", inSec: 2 },
        { id: "b", ref: "e2", src: "v2:output" },
      ],
      overlay: [{ id: "t", kind: "text", text: "hi" }],
    });
    const edges = [
      edge("new-1", "v1", "seq", "videos"),
      edge("e3", "v3", "seq", "videos"),
      edge("e4", "img", "seq", "refImages"),
      edge("e5", "bgm", "seq", "audios"),
      edge("x", "v9", "other", "videos"),
    ];
    const out = syncSequenceWithEdges(s, "seq", edges, newId);
    assert.deepEqual(
      out.tracks.video.map((c) => [c.id, c.ref, c.inSec]),
      [
        ["a", "new-1", 2],
        ["clip-1", "e3", 0],
      ],
    );
    assert.deepEqual(out.tracks.overlay.map((l) => [l.kind, l.ref]), [["text", undefined], ["image", "e4"]]);
    assert.deepEqual(out.tracks.audio.map((a) => a.ref), ["e5"]);
  });
});

describe("concat → sequence", () => {
  it("absorbs a nested concat chain, keeps joins, and rewires downstream", () => {
    const nodes = [
      model("v1", "x"),
      model("v2", "x"),
      model("v3", "x"),
      model("c1", "ffmpeg:concat", { ffmpegTransition: "cut" }),
      model("c2", "ffmpeg:concat", { ffmpegTransition: "fade", ffmpegTransitionSec: 0.5, ffmpegAspect: "16:9" }),
      model("out", "ffmpeg:export"),
    ];
    const edges = [
      edge("a", "v1", "c1", "videos"),
      edge("b", "v2", "c1", "videos"),
      edge("c", "c1", "c2", "videos"),
      edge("d", "v3", "c2", "videos"),
      edge("e", "c2", "out", "video"),
    ];
    const groups = [{ id: "g", title: "T", color: "blue", memberIds: ["c1", "c2", "v1"] }] as never;
    const plan = planConcatToSequence({ nodes, edges }, "c2");
    assert.ok(!("error" in plan));
    assert.deepEqual(plan.absorbedIds, ["c2", "c1"]);
    assert.deepEqual(
      plan.clips.map((c) => [c.source, c.transitionIn?.effect]),
      [
        ["v1", undefined],
        ["v2", undefined],
        ["v3", "fade"],
      ],
    );
    let k = 0;
    const out = applyConcatToSequence({ nodes, edges, groups }, plan, { nodeId: "seq", edgeId: () => `n${++k}`, itemId: (p) => p });
    assert.deepEqual(out.nodes.map((x) => x.id).sort(), ["out", "seq", "v1", "v2", "v3"]);
    const node = out.nodes.find((x) => x.id === "seq")!;
    assert.equal(node.data.modelId, SEQUENCE_MODEL_ID);
    const s = readSequence(node.data.toolParams);
    assert.equal(s.aspectRatio, "16:9");
    assert.equal(s.tracks.video[2]!.transitionIn?.durationSec, 0.5);
    assert.ok(out.edges.some((e) => e.source === "seq" && e.target === "out" && e.targetHandle === "video"));
    assert.equal(out.edges.filter((e) => e.target === "seq").length, 3);
    assert.deepEqual(out.groups?.[0]?.memberIds, ["v1", "seq"]);
  });

  it("refuses a node that is not a concat", () => {
    assert.ok("error" in planConcatToSequence({ nodes: [model("x", "ffmpeg:trim-speed")], edges: [] }, "x"));
  });
});

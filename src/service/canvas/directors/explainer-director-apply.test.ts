import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  applyDirectorBuild,
  directorRevealSteps,
  mergeDirectorRows,
  syncDirectorReplanRows,
} from "@/service/canvas/directors/explainer-director-apply";

const node = (id: string): CanvasNode => ({ id, type: "model", position: { x: 0, y: 0 }, data: { modelId: "x" } });
const model = (id: string, data: CanvasNode["data"]): CanvasNode => ({
  id,
  type: "model",
  position: { x: 0, y: 0 },
  data,
});
const media = (id: string, url: string): CanvasNode => ({
  id,
  type: "media",
  position: { x: 10, y: 20 },
  data: { label: "參考圖 1", fileName: "參考圖 1", mediaKind: "image", mediaUrl: url },
});
const refWire = (source: string, target: string): CanvasEdge => ({
  id: `${source}->${target}:refImages`,
  source,
  sourceHandle: "output",
  target,
  targetHandle: "refImages",
});
const wire = (source: string, target: string, sourceHandle = "output"): CanvasEdge => ({
  id: `${source}:${sourceHandle}->${target}`,
  source,
  sourceHandle,
  target,
  targetHandle: "prompt",
});

describe("director graph apply", () => {
  it("build adds the rows and keeps everything else", () => {
    const out = applyDirectorBuild(
      { nodes: [node("dir"), node("keep")], edges: [] },
      { directorId: "dir", expansion: { nodes: [node("frame")], edges: [wire("dir", "frame", "clip-1-frame")] } },
    );
    assert.deepEqual(out.nodes.map((n) => n.id), ["dir", "keep", "frame"]);
    assert.equal(out.edges.length, 1);
    assert.deepEqual(out.removedIds, []);
  });

  it("rebuild removes the old group's members except the Director and resets downstream nodes", () => {
    const clearedAt = "2026-11-26T14:00:00.000Z";
    const graph = {
      nodes: [
        node("dir"),
        model("old-frame", { modelId: "x", status: "completed", outputUrl: "https://cdn.example/old.jpg" }),
        model("downstream-sub", {
          modelId: "ffmpeg:burn-subtitles",
          status: "completed",
          outputUrl: "https://cdn.example/sub.mp4",
          outputKind: "video",
          lastJobId: "6740000100000000000000aa",
          staleOutputUrl: "https://cdn.example/sub.mp4",
        }),
        model("keep", { modelId: "x", status: "completed", outputUrl: "https://cdn.example/keep.jpg" }),
      ],
      edges: [wire("dir", "old-frame", "clip-1-frame"), wire("old-frame", "downstream-sub")],
    };
    const out = applyDirectorBuild(graph, {
      directorId: "dir",
      expansion: { nodes: [node("new-frame")], edges: [wire("dir", "new-frame", "clip-1-frame")] },
      replaceGroup: { id: "g", title: "t", color: "rose", kind: "explainer", memberIds: ["dir", "old-frame"] },
      clearedAt,
    });
    assert.deepEqual(out.nodes.map((n) => n.id).sort(), ["dir", "downstream-sub", "keep", "new-frame"]);
    assert.deepEqual(out.removedIds, ["old-frame"]);
    assert.deepEqual(out.resetIds, ["downstream-sub"]);
    const downstream = out.nodes.find((n) => n.id === "downstream-sub")!;
    assert.equal(downstream.data.status, "idle");
    assert.equal(downstream.data.outputUrl, undefined);
    assert.equal(downstream.data.lastJobId, undefined);
    assert.equal(downstream.data.staleOutputUrl, undefined);
    assert.equal(downstream.data.outputClearedAt, clearedAt);
    assert.equal(out.nodes.find((n) => n.id === "keep")?.data.outputUrl, "https://cdn.example/keep.jpg");
    assert.deepEqual(out.edges.map((e) => e.target), ["new-frame"]);
  });

  it("merges the finished plan onto rows built while planning", () => {
    const placed = { ...node("frame"), position: { x: 500, y: 40 } };
    const out = mergeDirectorRows(
      { nodes: [node("dir"), placed], edges: [wire("dir", "video", "clip-1-motion")] },
      {
        nodes: [{ ...node("frame"), data: { modelId: "x", resolution: "2k" } }, node("ref")],
        edges: [wire("dir", "video", "clip-1-motion"), wire("dir", "frame", "clip-1-frame"), wire("ref", "frame")],
      },
    );
    const frame = out.nodes.find((n) => n.id === "frame")!;
    assert.deepEqual(frame.position, { x: 500, y: 40 });
    assert.equal(frame.data.resolution, "2k");
    assert.deepEqual(out.addedIds, ["ref"]);
    assert.equal(out.edges.length, 3);
  });

  it("same-count replan keeps row ids, swaps ref still and voice, and resets all children + downstream nodes", () => {
    const clearedAt = "2026-11-26T14:00:00.000Z";
    const shop = "https://cdn.example/shop.jpg";
    const jim = "https://cdn.example/jim.png";
    const voice = model("exp-old-voice-1", {
      modelId: "scro:tts",
      prompt: "",
      status: "completed",
      outputUrl: "https://cdn.example/cathy.mp3",
      outputKind: "audio",
      lastJobId: "6740000100000000000000aa",
      lastCostUsd: 0.02,
      staleOutputUrl: "https://cdn.example/cathy.mp3",
      toolParams: { language: "yue", voicePreset: "cathy", ttsSpeed: 1.25 },
    });
    voice.position = { x: 80, y: 90 };
    const graph = {
      nodes: [
        node("dir"),
        media("exp-old-ref-1", shop),
        media("exp-old-ref-2", "https://cdn.example/removed-prop.png"),
        model("exp-old-frame-1", {
          modelId: "google:gemini-nano-banana-2.1",
          prompt: "",
          status: "completed",
          outputUrl: "https://cdn.example/frame.jpg",
          outputKind: "image",
          lastJobId: "6740000100000000000000ab",
        }),
        model("exp-old-video-1", {
          modelId: "minimax:MiniMax-H3",
          prompt: "",
          status: "failed",
          lastError: "old error",
          lastJobId: "6740000100000000000000ac",
        }),
        voice,
        model("exp-old-mux-1", {
          modelId: "ffmpeg:audio-mux",
          status: "completed",
          outputUrl: "https://cdn.example/mux.mp4",
          outputKind: "video",
        }),
        model("downstream-export", {
          modelId: "ffmpeg:burn-subtitles",
          status: "completed",
          outputUrl: "https://cdn.example/final.mp4",
          outputKind: "video",
        }),
        model("other", { modelId: "x", status: "completed", outputUrl: "https://cdn.example/other.png" }),
      ],
      edges: [
        refWire("exp-old-ref-1", "exp-old-frame-1"),
        refWire("exp-old-ref-2", "exp-old-frame-1"),
        wire("dir", "exp-old-frame-1", "clip-1-frame"),
        wire("dir", "exp-old-voice-1", "clip-1-voice"),
        wire("exp-old-frame-1", "exp-old-video-1"),
        wire("exp-old-video-1", "exp-old-mux-1"),
        wire("exp-old-voice-1", "exp-old-mux-1"),
        wire("exp-old-mux-1", "downstream-export"),
      ],
    };
    const expansion = {
      nodes: [
        media("exp-new-ref-1", jim),
        model("exp-new-frame-1", { modelId: "google:gemini-nano-banana-2.1", prompt: "", status: "idle" }),
        model("exp-new-video-1", { modelId: "minimax:MiniMax-H3", prompt: "", status: "idle" }),
        model("exp-new-voice-1", {
          modelId: "scro:tts",
          prompt: "",
          status: "idle",
          toolParams: { language: "yue", voicePreset: "alan", ttsSpeed: 1.25, characterId: "jim" },
        }),
        model("exp-new-mux-1", { modelId: "ffmpeg:audio-mux", status: "idle" }),
      ],
      edges: [
        refWire("exp-new-ref-1", "exp-new-frame-1"),
        wire("dir", "exp-new-frame-1", "clip-1-frame"),
        wire("dir", "exp-new-voice-1", "clip-1-voice"),
      ],
    };
    const out = syncDirectorReplanRows(
      graph,
      expansion,
      ["dir", "exp-old-ref-1", "exp-old-ref-2", "exp-old-frame-1", "exp-old-video-1", "exp-old-voice-1", "exp-old-mux-1"],
      clearedAt,
    );
    const ref = out.nodes.find((n) => n.id === "exp-old-ref-1")!;
    const keptVoice = out.nodes.find((n) => n.id === "exp-old-voice-1")!;
    const keptFrame = out.nodes.find((n) => n.id === "exp-old-frame-1")!;
    const keptVideo = out.nodes.find((n) => n.id === "exp-old-video-1")!;
    const keptMux = out.nodes.find((n) => n.id === "exp-old-mux-1")!;
    const downstream = out.nodes.find((n) => n.id === "downstream-export")!;
    const other = out.nodes.find((n) => n.id === "other")!;

    assert.equal(ref.data.mediaUrl, jim);
    assert.deepEqual(out.removedIds, ["exp-old-ref-2"]);
    assert.equal(out.nodes.some((n) => n.id === "exp-old-ref-2"), false);

    assert.equal(keptVoice.data.toolParams?.voicePreset, "alan");
    assert.equal(keptVoice.data.toolParams?.characterId, "jim");
    assert.equal(keptVoice.data.status, "idle");
    assert.equal(keptVoice.data.outputUrl, undefined);
    assert.equal(keptVoice.data.outputKind, undefined);
    assert.equal(keptVoice.data.lastJobId, undefined);
    assert.equal(keptVoice.data.lastCostUsd, undefined);
    assert.equal(keptVoice.data.staleOutputUrl, undefined);
    assert.equal(keptVoice.data.outputClearedAt, clearedAt);
    assert.deepEqual(keptVoice.position, { x: 80, y: 90 });

    assert.equal(keptFrame.data.status, "idle");
    assert.equal(keptFrame.data.outputUrl, undefined);
    assert.equal(keptFrame.data.outputClearedAt, clearedAt);

    assert.equal(keptVideo.data.status, "idle");
    assert.equal(keptVideo.data.lastError, undefined);
    assert.equal(keptVideo.data.lastJobId, undefined);
    assert.equal(keptVideo.data.outputClearedAt, clearedAt);

    assert.equal(keptMux.data.status, "idle");
    assert.equal(keptMux.data.outputUrl, undefined);

    assert.equal(downstream.data.status, "idle");
    assert.equal(downstream.data.outputUrl, undefined);
    assert.equal(downstream.data.outputClearedAt, clearedAt);

    assert.equal(other.data.status, "completed");
    assert.equal(other.data.outputUrl, "https://cdn.example/other.png");

    assert.deepEqual(
      out.resetIds.sort(),
      ["downstream-export", "exp-old-frame-1", "exp-old-mux-1", "exp-old-video-1", "exp-old-voice-1"],
    );
    assert.equal(out.nodes.some((n) => n.id.startsWith("exp-new-")), false);
    assert.deepEqual(
      out.edges.filter((e) => e.targetHandle === "refImages").map((e) => [e.source, e.target]),
      [["exp-old-ref-1", "exp-old-frame-1"]],
    );
    assert.ok(out.edges.some((e) => e.target === "exp-old-voice-1" && e.sourceHandle === "clip-1-voice"));
    assert.ok(out.changedIds.includes("exp-old-ref-1"));
    assert.ok(out.changedIds.includes("exp-old-voice-1"));
    assert.ok(out.changedIds.includes("exp-old-frame-1"));
  });

  it("same-count Talking Head replan resets frame, voice, video, silence, grade, and concat nodes", () => {
    const clearedAt = "2026-11-26T14:05:00.000Z";
    const director = model("th-dir", {
      modelId: "scro:talking-head",
      toolParams: { plannerMode: true },
    });
    const done = (id: string, modelId: string) =>
      model(id, {
        modelId,
        status: "completed",
        outputUrl: `https://cdn.example/${id}.mp4`,
        outputKind: "video",
        lastJobId: "6740000100000000000000aa",
      });
    const graph = {
      nodes: [
        director,
        media("th-old-ref-1", "https://cdn.example/old-face.png"),
        done("th-old-frame-1", "openrouter:bytedance-seed/seedream-5-0-pro"),
        done("th-old-voice-1", "scro:tts"),
        done("th-old-video-1", "openrouter:heygen/avatar-iv"),
        done("th-old-silence-1", "ffmpeg:smooth-silence"),
        done("th-old-grade-1", "ffmpeg:color-grade"),
        done("th-old-concat-1", "ffmpeg:concat"),
      ],
      edges: [
        refWire("th-old-ref-1", "th-old-frame-1"),
        wire("th-dir", "th-old-frame-1", "clip-1-frame"),
        wire("th-dir", "th-old-voice-1", "clip-1-voice"),
        wire("th-dir", "th-old-video-1", "clip-1-motion"),
        wire("th-old-frame-1", "th-old-video-1"),
        wire("th-old-voice-1", "th-old-video-1"),
        wire("th-old-video-1", "th-old-silence-1"),
        wire("th-old-silence-1", "th-old-grade-1"),
        wire("th-old-grade-1", "th-old-concat-1"),
      ],
    };
    const expansion = {
      nodes: [
        media("th-new-ref-1", "https://cdn.example/new-face.png"),
        model("th-new-frame-1", { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", status: "idle" }),
        model("th-new-voice-1", { modelId: "scro:tts", status: "idle" }),
        model("th-new-video-1", { modelId: "openrouter:heygen/avatar-iv", status: "idle" }),
        model("th-new-silence-1", { modelId: "ffmpeg:smooth-silence", status: "idle" }),
        model("th-new-grade-1", { modelId: "ffmpeg:color-grade", status: "idle" }),
        model("th-new-concat-1", { modelId: "ffmpeg:concat", status: "idle" }),
      ],
      edges: [refWire("th-new-ref-1", "th-new-frame-1")],
    };
    const memberIds = graph.nodes.map((n) => n.id);
    const out = syncDirectorReplanRows(graph, expansion, memberIds, clearedAt);
    assert.equal(out.nodes.find((n) => n.id === "th-old-ref-1")?.data.mediaUrl, "https://cdn.example/new-face.png");
    assert.deepEqual(
      out.resetIds.sort(),
      ["th-old-concat-1", "th-old-frame-1", "th-old-grade-1", "th-old-silence-1", "th-old-video-1", "th-old-voice-1"],
    );
    for (const id of out.resetIds) {
      const n = out.nodes.find((item) => item.id === id)!;
      assert.equal(n.data.status, "idle");
      assert.equal(n.data.outputUrl, undefined);
      assert.equal(n.data.lastJobId, undefined);
      assert.equal(n.data.outputClearedAt, clearedAt);
    }
    // Director node itself is not cleared.
    assert.equal(out.nodes.find((n) => n.id === "th-dir")?.data.outputClearedAt, undefined);
  });

  it("adds a new reference still onto the existing frame and leaves another group's still", () => {
    const graph = {
      nodes: [
        media("exp-old-ref-1", "https://cdn.example/jim.png"),
        model("exp-old-frame-1", { modelId: "google:gemini-nano-banana-2.1", prompt: "" }),
        media("exp-other-ref-1", "https://cdn.example/other.png"),
      ],
      edges: [refWire("exp-old-ref-1", "exp-old-frame-1"), refWire("exp-other-ref-1", "exp-other-frame-1")],
    };
    const expansion = {
      nodes: [
        media("exp-new-ref-1", "https://cdn.example/jim.png"),
        media("exp-new-ref-2", "https://cdn.example/prop.png"),
        model("exp-new-frame-1", { modelId: "google:gemini-nano-banana-2.1", prompt: "" }),
      ],
      edges: [
        refWire("exp-new-ref-1", "exp-new-frame-1"),
        refWire("exp-new-ref-2", "exp-new-frame-1"),
      ],
    };
    const out = syncDirectorReplanRows(graph, expansion, ["exp-old-ref-1", "exp-old-frame-1"]);
    assert.deepEqual(out.addedIds, ["exp-new-ref-2"]);
    assert.equal(out.nodes.find((n) => n.id === "exp-other-ref-1")?.data.mediaUrl, "https://cdn.example/other.png");
    assert.deepEqual(
      out.edges
        .filter((e) => e.target === "exp-old-frame-1")
        .map((e) => e.source)
        .sort(),
      ["exp-new-ref-2", "exp-old-ref-1"],
    );
    assert.ok(out.edges.some((e) => e.source === "exp-other-ref-1" && e.target === "exp-other-frame-1"));
  });

  it("reveals one node per step and each wire once both ends are placed", () => {
    const steps = directorRevealSteps(
      {
        nodes: [node("a"), node("b"), node("c")],
        edges: [wire("dir", "a", "clip-1-voice"), wire("a", "c"), wire("b", "c")],
      },
      ["dir"],
    );
    assert.deepEqual(steps.map((s) => s.node.id), ["a", "b", "c"]);
    assert.deepEqual(steps.map((s) => s.edges.map((e) => e.id)), [
      ["dir:clip-1-voice->a"],
      [],
      ["a:output->c", "b:output->c"],
    ]);
  });
});

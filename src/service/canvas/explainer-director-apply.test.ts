import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  applyDirectorBuild,
  directorRevealSteps,
  mergeDirectorRows,
  syncDirectorReplanRows,
} from "@/service/canvas/explainer-director-apply";

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

  it("rebuild removes the old group's members except the Director", () => {
    const graph = {
      nodes: [node("dir"), node("old-frame"), node("keep")],
      edges: [wire("dir", "old-frame", "clip-1-frame")],
    };
    const out = applyDirectorBuild(graph, {
      directorId: "dir",
      expansion: { nodes: [node("new-frame")], edges: [wire("dir", "new-frame", "clip-1-frame")] },
      replaceGroup: { id: "g", title: "t", color: "rose", kind: "explainer", memberIds: ["dir", "old-frame"] },
    });
    assert.deepEqual(out.nodes.map((n) => n.id).sort(), ["dir", "keep", "new-frame"]);
    assert.deepEqual(out.removedIds, ["old-frame"]);
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

  it("same-count replan keeps row ids and swaps the reference still and the voice", () => {
    const shop = "https://cdn.example/shop.jpg";
    const jim = "https://cdn.example/jim.png";
    const voice = model("exp-old-voice-1", {
      modelId: "scro:tts",
      prompt: "",
      status: "completed",
      outputUrl: "https://cdn.example/cathy.mp3",
      toolParams: { language: "yue", voicePreset: "cathy", ttsSpeed: 1.25 },
    });
    voice.position = { x: 80, y: 90 };
    const graph = {
      nodes: [
        node("dir"),
        media("exp-old-ref-1", shop),
        model("exp-old-frame-1", { modelId: "google:gemini-nano-banana-2.1", prompt: "", status: "completed", outputUrl: "https://cdn.example/frame.jpg" }),
        voice,
        node("other"),
      ],
      edges: [
        refWire("exp-old-ref-1", "exp-old-frame-1"),
        wire("dir", "exp-old-frame-1", "clip-1-frame"),
        wire("dir", "exp-old-voice-1", "clip-1-voice"),
      ],
    };
    const expansion = {
      nodes: [
        media("exp-new-ref-1", jim),
        model("exp-new-frame-1", { modelId: "google:gemini-nano-banana-2.1", prompt: "", status: "idle" }),
        model("exp-new-voice-1", {
          modelId: "scro:tts",
          prompt: "",
          status: "idle",
          toolParams: { language: "yue", voicePreset: "alan", ttsSpeed: 1.25, characterId: "jim" },
        }),
      ],
      edges: [
        refWire("exp-new-ref-1", "exp-new-frame-1"),
        wire("dir", "exp-new-frame-1", "clip-1-frame"),
        wire("dir", "exp-new-voice-1", "clip-1-voice"),
      ],
    };
    const out = syncDirectorReplanRows(graph, expansion, ["dir", "exp-old-ref-1", "exp-old-frame-1", "exp-old-voice-1"]);
    const ref = out.nodes.find((n) => n.id === "exp-old-ref-1")!;
    const keptVoice = out.nodes.find((n) => n.id === "exp-old-voice-1")!;
    assert.equal(ref.data.mediaUrl, jim);
    assert.equal(keptVoice.data.toolParams?.voicePreset, "alan");
    assert.equal(keptVoice.data.toolParams?.characterId, "jim");
    assert.equal(keptVoice.data.outputUrl, "https://cdn.example/cathy.mp3");
    assert.equal(keptVoice.data.status, "completed");
    assert.deepEqual(keptVoice.position, { x: 80, y: 90 });
    assert.equal(out.nodes.some((n) => n.id.startsWith("exp-new-")), false);
    assert.equal(out.nodes.some((n) => n.id === "other"), true);
    assert.deepEqual(
      out.edges.filter((e) => e.targetHandle === "refImages").map((e) => [e.source, e.target]),
      [["exp-old-ref-1", "exp-old-frame-1"]],
    );
    assert.ok(out.edges.some((e) => e.target === "exp-old-voice-1" && e.sourceHandle === "clip-1-voice"));
    assert.ok(out.changedIds.includes("exp-old-ref-1"));
    assert.ok(out.changedIds.includes("exp-old-voice-1"));
    assert.ok(out.changedIds.includes("exp-old-frame-1"));
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

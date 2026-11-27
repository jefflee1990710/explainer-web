import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { syncSwapDirectorGroupMembers } from "@/service/canvas/directors/swap-group-membership";

function node(id: string, type: CanvasNode["type"], data: CanvasNode["data"] = {}): CanvasNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function director(id = "dir", extra: CanvasNode["data"] = {}): CanvasNode {
  return node(id, "model", {
    modelId: "scro:swap",
    status: "idle",
    ...extra,
    toolParams: { directorMode: true, swapMode: "character", ...(extra.toolParams ?? {}) },
  });
}

function edge(source: string, target: string, targetHandle: string): CanvasEdge {
  return { id: `${source}->${target}:${targetHandle}`, source, sourceHandle: "output", target, targetHandle };
}

function swapGroup(memberIds: string[], id = "swap-1"): CanvasGroup {
  return { id, title: "Scro Swap", color: "violet", kind: "swap", memberIds };
}

const video = node("video", "media", { mediaKind: "video", mediaUrl: "https://blob.example/clip.mp4" });
const character = node("hero", "character", { characterId: "char-1", mediaKind: "image" });
const trim = node("trim", "model", { modelId: "ffmpeg:trim-speed", status: "idle" });
const grade = node("grade", "model", { modelId: "ffmpeg:color-grade", status: "idle" });

describe("syncSwapDirectorGroupMembers", () => {
  it("pulls source video, character, and downstream trim into the Scro Swap group", () => {
    const groups = [swapGroup(["dir"])];
    const nodes = [director(), video, character, trim, grade];
    const edges = [
      edge("video", "dir", "video"),
      edge("hero", "dir", "refImages"),
      edge("dir", "trim", "video"),
      edge("trim", "grade", "video"),
    ];
    const out = syncSwapDirectorGroupMembers(nodes, edges, groups);
    assert.deepEqual(out[0]!.memberIds, ["dir", "video", "hero", "trim"]);
    assert.equal(out[0]!.kind, "swap");
    assert.equal(out.some((group) => group.memberIds.includes("grade")), false);
  });

  it("drops a node from the group once its wire to the director is gone", () => {
    const nodes = [director(), video, character, trim];
    const connected = [
      edge("video", "dir", "video"),
      edge("hero", "dir", "refImages"),
      edge("dir", "trim", "video"),
    ];
    const grouped = syncSwapDirectorGroupMembers(nodes, connected, [swapGroup(["dir"])]);
    const withoutVideo = syncSwapDirectorGroupMembers(
      nodes,
      connected.filter((item) => item.source !== "video"),
      grouped,
    );
    assert.deepEqual(withoutVideo[0]!.memberIds, ["dir", "hero", "trim"]);

    const withoutTrim = syncSwapDirectorGroupMembers(
      nodes,
      connected.filter((item) => item.target !== "trim"),
      grouped,
    );
    assert.equal(withoutTrim[0]!.memberIds.includes("trim"), false);
    assert.deepEqual(withoutTrim[0]!.memberIds, ["dir", "video", "hero"]);
  });

  it("moves a connected node out of another group and leaves an unrelated group alone", () => {
    const custom: CanvasGroup = { id: "custom", title: "Other", color: "slate", kind: "custom", memberIds: ["video", "note"] };
    const note = node("note", "prompt", { text: "keep me" });
    const out = syncSwapDirectorGroupMembers(
      [director(), video, note],
      [edge("video", "dir", "video")],
      [custom, swapGroup(["dir"])],
    );
    assert.deepEqual(out.find((group) => group.id === "swap-1")!.memberIds, ["dir", "video"]);
    assert.deepEqual(out.find((group) => group.id === "custom")!.memberIds, ["note"]);
  });

  it("keeps Build rows in the group and still adopts wires onto the director", () => {
    const built = director("dir", { toolParams: { expandedNodeIds: ["trim", "render"] } });
    const render = node("render", "model", { modelId: "scro:swap-render", status: "idle" });
    const groups = [swapGroup(["dir", "trim", "render"])];
    const out = syncSwapDirectorGroupMembers(
      [built, video, trim, render],
      [edge("video", "dir", "video"), edge("trim", "render", "video")],
      groups,
    );
    assert.deepEqual(out[0]!.memberIds, ["dir", "trim", "render", "video"]);

    const disconnected = syncSwapDirectorGroupMembers([built, video, trim, render], [], out);
    assert.deepEqual(disconnected[0]!.memberIds, ["dir", "trim", "render"]);
  });

  it("does not invent a group until a director is added or a new wire touches it", () => {
    const nodes = [director(), video];
    const edges = [edge("video", "dir", "video")];
    const idle = syncSwapDirectorGroupMembers(nodes, edges, []);
    assert.equal(idle.length, 0);
    const created = syncSwapDirectorGroupMembers(nodes, edges, [], { createMissing: true });
    assert.equal(created.length, 1);
    assert.equal(created[0]!.kind, "swap");
    assert.deepEqual(created[0]!.memberIds, ["dir", "video"]);
  });

  it("leaves a Teleport director and an already-correct Swap group untouched", () => {
    const teleport = node("tp", "model", {
      modelId: "scro:teleport",
      status: "idle",
      toolParams: { directorMode: true },
    });
    const groups = [swapGroup(["dir", "video"])];
    const out = syncSwapDirectorGroupMembers(
      [director(), video, teleport],
      [edge("video", "dir", "video")],
      groups,
    );
    assert.equal(out, groups);
    assert.equal(
      syncSwapDirectorGroupMembers([teleport, video], [edge("video", "tp", "video")], [], { createMissing: true }).length,
      0,
    );
  });

  it("includes every director port, including prompt and any downstream node", () => {
    const prompt = node("prompt", "prompt", { text: "blue jacket" });
    const mux = node("mux", "model", { modelId: "ffmpeg:audio-mux", status: "idle" });
    const out = syncSwapDirectorGroupMembers(
      [director(), prompt, mux],
      [edge("prompt", "dir", "prompt"), edge("dir", "mux", "video")],
      [swapGroup(["dir"])],
    );
    assert.deepEqual(out[0]!.memberIds, ["dir", "prompt", "mux"]);
  });
});

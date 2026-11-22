import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import {
  addContextRef,
  composeCanvasAgentMessage,
  contextChipLabel,
  contextMenuChoices,
  formatCanvasAgentContext,
} from "@/service/canvas-agent/context-block";

const nodes: CanvasNode[] = [
  {
    id: "exp-020dc4-frame-1",
    type: "model",
    position: { x: 0, y: 0 },
    data: { modelId: "google:gemini-nano-banana-2.1", prompt: "Hook still of Jim at the board", status: "idle" },
  },
  {
    id: "clip",
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: "Source", mediaKind: "video", mediaUrl: "https://blob.example/clip.mp4" },
  },
];

const groups: CanvasGroup[] = [
  {
    id: "exp-020dc4",
    title: "Explainer",
    color: "lime",
    kind: "explainer",
    memberIds: ["exp-020dc4-frame-1", "exp-020dc4-video-1"],
  },
];

describe("canvas agent context from a right-click", () => {
  it("offers the node, and the whole group when the node is in one", () => {
    assert.deepEqual(contextMenuChoices({ groupId: null }), [{ kind: "node" }]);
    assert.deepEqual(contextMenuChoices({ groupId: "exp-020dc4" }), [
      { kind: "node" },
      { kind: "group", groupId: "exp-020dc4" },
    ]);
    assert.deepEqual(contextMenuChoices({ groupId: "exp-020dc4", frame: true }), [
      { kind: "group", groupId: "exp-020dc4" },
    ]);
  });

  it("keeps one chip per node or group and drops the oldest past the cap", () => {
    const first = addContextRef([], { kind: "node", id: "a" });
    const again = addContextRef(first, { kind: "node", id: "a" });
    assert.equal(again.length, 1);
    let refs = first;
    for (let i = 0; i < 10; i += 1) refs = addContextRef(refs, { kind: "node", id: `n${i}` });
    assert.equal(refs.length, 8);
    assert.equal(refs[0]?.id, "n2");
    assert.equal(refs.some((r) => r.id === "a"), false);
  });

  it("writes a short block the agent can act on, and skips anything already gone", () => {
    const block = formatCanvasAgentContext(
      [
        { kind: "node", id: "exp-020dc4-frame-1" },
        { kind: "group", id: "exp-020dc4" },
        { kind: "node", id: "missing" },
      ],
      nodes,
      groups,
    );
    assert.match(block, /^\[Context\]/);
    assert.match(block, /exp-020dc4-frame-1/);
    assert.match(block, /google:gemini-nano-banana-2\.1/);
    assert.match(block, /group exp-020dc4 "Explainer"/);
    assert.match(block, /Hook still of Jim/);
    assert.match(block, /explainer · 2 nodes/);
    assert.doesNotMatch(block, /missing/);
    assert.equal(
      contextChipLabel({ kind: "node", id: "exp-020dc4-frame-1" }, nodes, groups),
      "gemini-nano-banana-2.1",
    );
    assert.equal(contextChipLabel({ kind: "group", id: "exp-020dc4" }, nodes, groups), "Explainer");
    assert.equal(formatCanvasAgentContext([{ kind: "node", id: "missing" }], nodes, groups), "");
  });

  it("puts the context ahead of the user's words and stays inside the message cap", () => {
    const block = formatCanvasAgentContext([{ kind: "node", id: "clip" }], nodes, groups);
    const message = composeCanvasAgentMessage("change this to 10 seconds", block);
    assert.match(message, /^\[Context\]/);
    assert.match(message, /change this to 10 seconds$/);
    assert.match(message, /Source/);

    const long = composeCanvasAgentMessage("x".repeat(1990), block, 2000);
    assert.ok(long.length <= 2000);
    assert.match(long, /x{10}/);
  });
});

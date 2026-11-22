import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGroupBuilder } from "@/service/canvas/scro-groups/builder";

describe("createGroupBuilder", () => {
  it("reuses existing nodes and only places new ones", () => {
    const b = createGroupBuilder({ idPrefix: "g1", origin: { x: 500, y: 100 } });
    const video = b.media("video", { nodeId: "existing" });
    const ref = b.media("ref", { url: "https://x/a.png", name: "Jim", mediaKind: "image" });
    const model = b.model("render", { modelId: "scro:swap-render" });
    b.wire(video, model, "video");
    b.wire(ref, model, "refImages");
    const group = b.finish(model);

    assert.equal(video, "existing");
    assert.deepEqual(
      group.nodes.map((n) => n.id),
      ["g1-ref", "g1-render"],
    );
    assert.deepEqual(group.edges[0], {
      id: "existing->g1-render:video",
      source: "existing",
      sourceHandle: "output",
      target: "g1-render",
      targetHandle: "video",
    });
    assert.equal(group.outputNodeId, "g1-render");
    const [refNode, renderNode] = group.nodes;
    assert.deepEqual(refNode!.position, { x: 500, y: 100 });
    assert.ok(renderNode!.position.x > refNode!.position.x);
    assert.equal(renderNode!.data.status, "idle");
    assert.equal(refNode!.data.mediaUrl, "https://x/a.png");
  });
});

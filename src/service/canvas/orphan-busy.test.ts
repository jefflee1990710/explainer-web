import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { failOrphanBusyNodes, ORPHAN_BUSY_ERROR } from "@/service/canvas/orphan-busy";

function node(id: string, data: CanvasNode["data"], type: CanvasNode["type"] = "model"): CanvasNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

describe("failOrphanBusyNodes", () => {
  it("fails queued model nodes that have no job", () => {
    const out = failOrphanBusyNodes([node("concat", { modelId: "ffmpeg:concat", status: "queued" })], false);
    assert.equal(out[0]?.data.status, "failed");
    assert.equal(out[0]?.data.lastError, ORPHAN_BUSY_ERROR);
  });

  it("keeps nodes with a job, character outfit runs, and everything during a flow run", () => {
    const nodes = [
      node("vid", { modelId: "openrouter:minimax/hailuo-3", status: "running", lastJobId: "j1" }),
      node("char", { status: "running", toolParams: { versionId: "v1" } }, "character"),
      node("concat", { modelId: "ffmpeg:concat", status: "queued" }),
    ];
    const idle = failOrphanBusyNodes(nodes, false);
    assert.equal(idle[0]?.data.status, "running");
    assert.equal(idle[1]?.data.status, "running");
    assert.equal(idle[2]?.data.status, "failed");
    assert.equal(failOrphanBusyNodes(nodes, true)[2]?.data.status, "queued");
  });
});

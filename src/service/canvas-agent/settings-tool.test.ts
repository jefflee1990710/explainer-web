import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { updateSettings } from "@/service/canvas-agent/settings-tool";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";

function canvas() {
  const nodes: CanvasNode[] = [
    {
      id: "swap-abc123-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: {
        settings: { vars: {} },
      },
    },
    {
      id: "swap-abc123-prompt",
      type: "prompt",
      position: { x: 0, y: 80 },
      data: { text: "Wear {{outfit}}" },
    },
    {
      id: "swap-abc123-render",
      type: "model",
      position: { x: 300, y: 0 },
      data: { modelId: "scro:swap-render", outputUrl: "https://x/r.mp4", status: "completed" },
    },
    {
      id: "swap-abc123-grade",
      type: "model",
      position: { x: 600, y: 0 },
      data: { modelId: "ffmpeg:color-grade", outputUrl: "https://x/g.mp4", status: "completed", toolParams: { gradeLook: "jutsu" } },
    },
  ];
  const edges: CanvasEdge[] = [
    {
      id: "s->prompt",
      source: "swap-abc123-settings",
      sourceHandle: "output",
      target: "swap-abc123-prompt",
      targetHandle: "settings",
    },
    {
      id: "p->render",
      source: "swap-abc123-prompt",
      sourceHandle: "output",
      target: "swap-abc123-render",
      targetHandle: "prompt",
    },
    { id: "rg", source: "swap-abc123-render", sourceHandle: "output", target: "swap-abc123-grade", targetHandle: "video" },
  ];
  const group: CanvasGroup = { id: "swap-abc123", title: "Swap", color: "violet", kind: "swap", memberIds: nodes.map((n) => n.id) };
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges,
    groups: [group],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    characters: [],
    nextId: () => `id${++n}`,
  });
}

describe("update_settings", () => {
  it("sets and removes {{key}} vars, marking only nodes whose prompt uses the key old", () => {
    const g = canvas();
    const res = updateSettings(g, { groupId: "swap-abc123", vars: { outfit: "red coat" } }) as { ok: boolean; changed: string[] };
    assert.equal(res.ok, true);
    assert.deepEqual(res.changed, ["vars.outfit"]);
    const stale = g.ops.find((op) => op.kind === "mark_stale");
    assert.deepEqual(stale && stale.kind === "mark_stale" ? stale.nodeIds : [], ["swap-abc123-render", "swap-abc123-grade"]);
    updateSettings(g, { groupId: "swap-abc123", vars: { outfit: null } });
    assert.deepEqual(g.nodes.find((x) => x.id === "swap-abc123-settings")!.data.settings!.vars, {});
    assert.ok("error" in updateSettings(g, { groupId: "swap-abc123", vars: { "bad key": "x" } }));
  });

  it("rejects unknown groups and no-op edits", () => {
    const g = canvas();
    assert.ok("error" in updateSettings(g, { groupId: "missing", vars: { a: "b" } }));
    assert.ok("error" in updateSettings(g, { groupId: "swap-abc123", vars: {} }));
  });
});

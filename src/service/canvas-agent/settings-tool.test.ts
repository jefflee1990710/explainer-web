import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import { updateSettings } from "@/service/canvas-agent/settings-tool";
import { CANVAS_AGENT_TOOL_HANDLERS as T, createWorkingGraph } from "@/service/canvas-agent/tools";

function canvas() {
  const nodes: CanvasNode[] = [
    {
      id: "swap-abc123-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: {
        settings: {
          kind: "swap",
          values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
        },
      },
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
  const edges: CanvasEdge[] = ["swap-abc123-render", "swap-abc123-grade"].map((target) => ({
    id: `s->${target}`,
    source: "swap-abc123-settings",
    sourceHandle: "output",
    target,
    targetHandle: "settings",
  }));
  edges.push({ id: "rg", source: "swap-abc123-render", sourceHandle: "output", target: "swap-abc123-grade", targetHandle: "video" });
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
  it("changes Swap values and marks only the affected previews old", () => {
    const g = canvas();
    const res = updateSettings(g, { groupId: "swap-abc123", values: { gradeLook: "talking-head" } }) as {
      ok: boolean;
      changed: string[];
    };
    assert.equal(res.ok, true);
    assert.deepEqual(res.changed, ["gradeLook"]);
    const settings = g.nodes.find((x) => x.id === "swap-abc123-settings")!.data.settings!;
    assert.equal(settings.kind === "swap" && settings.values.gradeLook, "talking-head");
    const stale = g.ops.find((op) => op.kind === "mark_stale");
    assert.deepEqual(stale && stale.kind === "mark_stale" ? stale.nodeIds : [], ["swap-abc123-grade"]);
  });

  it("rejects bad values and unknown groups", () => {
    const g = canvas();
    assert.ok("error" in updateSettings(g, { groupId: "swap-abc123", values: { sectionLength: 40 } }));
    assert.ok("error" in updateSettings(g, { groupId: "missing", values: {} }));
  });

  it("refuses direct edits to fields the settings node controls", () => {
    const g = canvas();
    const res = T.update_node(g, { nodeId: "swap-abc123-render", durationSeconds: 10 }) as { error?: string };
    assert.match(res.error ?? "", /update_settings/);
  });
});

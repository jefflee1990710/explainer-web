import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWireSettings, settingsVars, withoutModelSettingsEdges } from "@/service/canvas/core/settings/registry";

describe("Setting registry", () => {
  it("returns the vars map", () => {
    assert.deepEqual(settingsVars({ vars: { mood: "calm" } }), { mood: "calm" });
    assert.deepEqual(settingsVars({ vars: {} }), {});
    assert.deepEqual(settingsVars(undefined), {});
  });

  it("wires into Prompt nodes only", () => {
    assert.equal(canWireSettings({ id: "p", type: "prompt", data: {} }), true);
    assert.equal(canWireSettings({ id: "m", type: "model", data: {} }), false);
    assert.equal(canWireSettings({ id: "x", type: "media", data: {} }), false);
    assert.equal(
      canWireSettings({
        id: "exp",
        type: "model",
        data: { modelId: "scro:explainer", toolParams: { plannerMode: true } },
      }),
      false,
    );
  });

  it("drops a Setting wire that lands on a model and keeps one that lands on a Prompt", () => {
    const nodes = [
      { id: "s", type: "settings" },
      { id: "mux", type: "model" },
      { id: "p", type: "prompt" },
    ];
    const edges = [
      { target: "mux", targetHandle: "settings" },
      { target: "p", targetHandle: "settings" },
      { target: "mux", targetHandle: "video" },
    ];
    const dropped = withoutModelSettingsEdges(nodes, edges);
    assert.equal(dropped.dropped, true);
    assert.deepEqual(dropped.edges, [edges[1], edges[2]]);
  });
});

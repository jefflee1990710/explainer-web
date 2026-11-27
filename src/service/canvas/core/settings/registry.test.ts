import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWireSettings, settingsVars, withoutModelSettingsEdges } from "@/service/canvas/core/settings/registry";

describe("Setting registry", () => {
  it("returns the vars map", () => {
    assert.deepEqual(settingsVars({ vars: { mood: "calm" } }), { mood: "calm" });
    assert.deepEqual(settingsVars({ vars: {} }), {});
    assert.deepEqual(settingsVars(undefined), {});
  });

  it("wires into a Prompt and into any model that has a text field", () => {
    assert.equal(canWireSettings({ id: "p", type: "prompt", data: {} }), true);
    assert.equal(canWireSettings({ id: "m", type: "model", data: {} }), false);
    assert.equal(canWireSettings({ id: "x", type: "media", data: {} }), false);
    assert.equal(canWireSettings({ id: "g", type: "model", data: { modelId: "ffmpeg:color-grade" } }), false);
    assert.equal(canWireSettings({ id: "t", type: "model", data: { modelId: "scro:tts" } }), true);
    assert.equal(canWireSettings({ id: "title", type: "model", data: { modelId: "ffmpeg:text" } }), true);
    assert.equal(canWireSettings({ id: "cap", type: "model", data: { modelId: "scro:auto-captions" } }), true);
    assert.equal(
      canWireSettings({
        id: "exp",
        type: "model",
        data: { modelId: "scro:explainer", toolParams: { plannerMode: true } },
      }),
      true,
    );
  });

  it("drops a Setting wire on a model with no text field and keeps one on a Prompt or a text field", () => {
    const nodes = [
      { id: "s", type: "settings" },
      { id: "mux", type: "model", data: { modelId: "ffmpeg:audio-mux" } },
      { id: "title", type: "model", data: { modelId: "ffmpeg:text" } },
      { id: "p", type: "prompt" },
    ];
    const edges = [
      { target: "mux", targetHandle: "settings" },
      { target: "title", targetHandle: "settings" },
      { target: "p", targetHandle: "settings" },
      { target: "mux", targetHandle: "video" },
    ];
    const dropped = withoutModelSettingsEdges(nodes, edges);
    assert.equal(dropped.dropped, true);
    assert.deepEqual(dropped.edges, [edges[1], edges[2], edges[3]]);
  });
});

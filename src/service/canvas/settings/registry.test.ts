import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWireSettings, settingsVars } from "@/service/canvas/settings/registry";

describe("Setting registry", () => {
  it("returns the vars map", () => {
    assert.deepEqual(settingsVars({ vars: { mood: "calm" } }), { mood: "calm" });
    assert.deepEqual(settingsVars({ vars: {} }), {});
    assert.deepEqual(settingsVars(undefined), {});
  });

  it("wires into model and Prompt nodes only", () => {
    assert.equal(canWireSettings({ id: "m", type: "model", data: {} }), true);
    assert.equal(canWireSettings({ id: "p", type: "prompt", data: {} }), true);
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
});

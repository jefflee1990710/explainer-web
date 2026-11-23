import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasSettingsData, SwapSettings } from "@/model/canvas-settings";
import { settingsStaleTargets, withWiredSettings } from "@/service/canvas/settings/apply";

const values: SwapSettings = {
  swapMode: "character",
  sectionStart: 1,
  sectionLength: 8,
  aspectRatio: "16:9",
  gradeLook: "jutsu",
};
const settings: CanvasNode = {
  id: "s",
  type: "settings",
  position: { x: 0, y: 0 },
  data: { settings: { kind: "swap", values } },
};
const render: CanvasNode = {
  id: "r",
  type: "model",
  position: { x: 0, y: 0 },
  data: {
    modelId: "scro:swap-render",
    durationSeconds: 6,
    aspectRatio: "9:16",
    toolParams: { swapMode: "object", keep: 1 },
  },
};
const grade: CanvasNode = {
  id: "g",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } },
};
const edge = (source: string, target: string, targetHandle = "settings"): CanvasEdge => ({
  id: `${source}->${target}:${targetHandle}`,
  source,
  sourceHandle: "output",
  target,
  targetHandle,
});

describe("withWiredSettings", () => {
  it("writes the settings values over the wired target and keeps other tool params", () => {
    const out = withWiredSettings([settings, render], [edge("s", "r")]);
    const r = out.find((n) => n.id === "r")!;
    assert.equal(r.data.durationSeconds, 8);
    assert.equal(r.data.aspectRatio, "16:9");
    assert.deepEqual(r.data.toolParams, { swapMode: "character", keep: 1 });
  });

  it("leaves an unwired target as it is", () => {
    const out = withWiredSettings([settings, render], []);
    assert.deepEqual(out.find((n) => n.id === "r")!.data, render.data);
  });

  it("ignores a settings edge whose kind does not accept the target", () => {
    const tts: CanvasNode = {
      id: "t",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:tts", prompt: "hi" },
    };
    const out = withWiredSettings([settings, tts], [edge("s", "t")]);
    assert.deepEqual(out.find((n) => n.id === "t")!.data, tts.data);
  });
});

describe("settingsStaleTargets", () => {
  it("returns only targets whose resolved values change", () => {
    const next: CanvasSettingsData = { kind: "swap", values: { ...values, gradeLook: "talking-head" } };
    const edges = [edge("s", "r"), edge("s", "g")];
    assert.deepEqual(settingsStaleTargets([settings, render, grade], edges, "s", next), ["g"]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { settingsStaleTargets, templateText } from "@/service/canvas/core/settings/apply";

const settings: CanvasNode = {
  id: "s",
  type: "settings",
  position: { x: 0, y: 0 },
  data: { settings: { vars: { mood: "calm", place: "beach" } } },
};
const moody: CanvasNode = {
  id: "a",
  type: "prompt",
  position: { x: 0, y: 0 },
  data: { text: "A {{mood}} shot" },
};
const placed: CanvasNode = {
  id: "b",
  type: "prompt",
  position: { x: 0, y: 0 },
  data: { text: "At the {{place}}" },
};
const model: CanvasNode = {
  id: "m",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "x", prompt: "inline" },
};
const prompt: CanvasNode = { id: "p", type: "prompt", position: { x: 0, y: 0 }, data: { text: "Wired {{mood}}" } };
const edge = (source: string, target: string, targetHandle = "settings"): CanvasEdge => ({
  id: `${source}->${target}:${targetHandle}`,
  source,
  sourceHandle: "output",
  target,
  targetHandle,
});

describe("settingsStaleTargets", () => {
  it("returns only targets whose used placeholder values change", () => {
    const edges = [edge("s", "a"), edge("s", "b")];
    const next = { vars: { mood: "tense", place: "beach" } };
    assert.deepEqual(settingsStaleTargets([settings, moody, placed], edges, "s", next), ["a"]);
  });

  it("reads a model's wired Prompt text and its own text fields", () => {
    const edges = [edge("p", "m", "prompt")];
    assert.equal(templateText([prompt, model], edges, model), "Wired {{mood}}");
    assert.equal(templateText([prompt, model], edges, prompt), "Wired {{mood}}");
  });

  it("marks a text-field model stale when its used Setting value changes", () => {
    const title: CanvasNode = {
      id: "title",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "ffmpeg:text", toolParams: { ffmpegText: "Hello {{mood}}" } },
    };
    const edges = [edge("s", "title")];
    assert.deepEqual(
      settingsStaleTargets([settings, title], edges, "s", { vars: { mood: "tense", place: "beach" } }),
      ["title"],
    );
    assert.deepEqual(settingsStaleTargets([settings, title], edges, "s", { vars: { mood: "calm", place: "city" } }), []);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasSettingsData, SwapSettings } from "@/model/canvas-settings";
import {
  acceptsAnySettings,
  defaultSettings,
  resolveSettings,
  settingsAccepts,
  settingsChangedKeys,
} from "@/service/canvas/settings/registry";
import type { SettingsTarget } from "@/service/canvas/settings/types";

const model = (id: string, modelId: string): SettingsTarget => ({ id, type: "model", data: { modelId } });
const trim = model("swap-abc123-trim", "ffmpeg:trim-speed");
const swapRender = model("swap-abc123-render", "scro:swap-render");
const teleportRender = model("teleport-abc123-render", "scro:teleport-render");
const grade = model("swap-abc123-grade", "ffmpeg:color-grade");
const frame = model("exp-abc123-frame-1", "google:gemini-nano-banana-2.1");
const tts = model("x-voice-1", "scro:tts");

const swapValues: SwapSettings = {
  swapMode: "relight",
  lightLookId: "golden_halo",
  sectionStart: 2,
  sectionLength: 40,
  aspectRatio: "9:16",
  gradeLook: "jutsu",
};
const swap: CanvasSettingsData = { kind: "swap", values: swapValues };
const teleport: CanvasSettingsData = {
  kind: "teleport",
  values: { sectionStart: 0, sectionLength: 5, aspectRatio: "16:9", mood: "neon rain", gradeLook: "talking-head" },
};
const explainer: CanvasSettingsData = {
  kind: "explainer",
  plannerVideoId: "v1",
  topic: "t",
  applied: {
    skillSlug: "paper-cutout-explainer-video-director",
    textStyleId: "handwritten",
    sceneTextLanguage: "zh-Hant",
    presenterPosition: "auto",
  },
};
const noWire = { hasPromptWire: false };

describe("settings registry", () => {
  it("accepts only the targets of each kind", () => {
    assert.equal(settingsAccepts(swap, trim), true);
    assert.equal(settingsAccepts(swap, swapRender), true);
    assert.equal(settingsAccepts(swap, teleportRender), false);
    assert.equal(settingsAccepts(teleport, teleportRender), true);
    assert.equal(settingsAccepts(explainer, frame), true);
    assert.equal(settingsAccepts(explainer, trim), false);
    assert.equal(acceptsAnySettings(tts), false);
    assert.equal(acceptsAnySettings(grade), true);
  });

  it("resolves trim, render, and grade fields from Swap values", () => {
    assert.deepEqual(resolveSettings(swap, trim, noWire), {
      presetId: "1.0x",
      toolParams: { ffmpegStartSec: 2, ffmpegEndSec: 17, ffmpegSpeed: 1 },
    });
    assert.deepEqual(resolveSettings(swap, swapRender, noWire), {
      aspectRatio: "9:16",
      presetId: "9:16",
      durationSeconds: 15,
      toolParams: { swapMode: "relight", lightLookId: "golden_halo" },
    });
    assert.deepEqual(resolveSettings(swap, grade, noWire), { presetId: "jutsu", toolParams: { gradeLook: "jutsu" } });
  });

  it("uses Teleport mood as the render prompt only when no prompt is wired", () => {
    assert.equal(resolveSettings(teleport, teleportRender, noWire).prompt, "neon rain");
    assert.equal(resolveSettings(teleport, teleportRender, { hasPromptWire: true }).prompt, undefined);
    assert.equal(resolveSettings(teleport, teleportRender, noWire).durationSeconds, 5);
  });

  it("resolves nothing for Explainer, whose values live in the frame prompts", () => {
    assert.deepEqual(resolveSettings(explainer, frame, noWire), {});
  });

  it("lists changed keys and gives defaults for hand-added nodes", () => {
    const next: CanvasSettingsData = { kind: "swap", values: { ...swapValues, gradeLook: "talking-head" } };
    assert.deepEqual(settingsChangedKeys(swap, next), ["gradeLook"]);
    assert.equal(defaultSettings("swap").kind, "swap");
    assert.equal(defaultSettings("teleport").kind, "teleport");
  });
});

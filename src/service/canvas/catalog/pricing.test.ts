import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  CANVAS_MIN_CHARGE_USD,
  canvasMentalokMarkup,
  estimateCanvasModelCostUsd,
  formatCanvasModelCostUsd,
} from "@/service/canvas/catalog/pricing";

describe("canvas USD pricing", () => {
  it("resolves Mentalok markup with 1.5 default and ignores invalid env values", () => {
    assert.equal(CANVAS_MIN_CHARGE_USD, 0.005);
    assert.equal(canvasMentalokMarkup(undefined), 1.5);
    assert.equal(canvasMentalokMarkup(""), 1.5);
    assert.equal(canvasMentalokMarkup("-2"), 1.5);
    assert.equal(canvasMentalokMarkup("not-a-number"), 1.5);
    assert.equal(canvasMentalokMarkup("2.0"), 2.0);
  });

  it("applies Mentalok markup with $0.005 minimum floor and exact 4-decimal rounding", () => {
    const flux = findCanvasModel("mentalok:flux-schnell");
    const wan = findCanvasModel("mentalok:wan-2-1");
    const ref2va = findCanvasModel("mentalok:minimax-h3-ref2va");
    const qwenEdit = findCanvasModel("mentalok:qwen-image-edit-2511");
    assert.ok(flux && wan && ref2va && qwenEdit);

    // 0.0012 * 1.5 = 0.0018 -> clamped to $0.005 floor
    assert.equal(estimateCanvasModelCostUsd(flux, { markup: 1.5 }), 0.005);
    // 0.08 * 1.5 = 0.12
    assert.equal(estimateCanvasModelCostUsd(wan, { markup: 1.5 }), 0.12);
    // 0.21 * 1.5 = 0.315
    assert.equal(estimateCanvasModelCostUsd(ref2va, { markup: 1.5 }), 0.315);
    // 0.012 * 1.5 = 0.018
    assert.equal(estimateCanvasModelCostUsd(qwenEdit, { markup: 1.5 }), 0.018);

    // Custom markup override
    assert.equal(estimateCanvasModelCostUsd(wan, { markup: 2 }), 0.16);
  });

  it("prices OpenRouter image models at provider price × 1.5", () => {
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro");
    const seedreamLite = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-lite");
    assert.ok(seedream && seedreamLite);

    // Unset resolution follows the image request: Pro 1K $0.045, Lite only accepts 2K at $0.035.
    assert.equal(estimateCanvasModelCostUsd(seedream), 0.0675);
    assert.equal(estimateCanvasModelCostUsd(seedream, { resolution: "2k" }), 0.135);
    assert.equal(estimateCanvasModelCostUsd(seedreamLite), 0.0525);
  });

  it("prices OpenRouter video models from their own per-second SKU", () => {
    const hailuo = findCanvasModel("openrouter:minimax/hailuo-3");
    const seedance = findCanvasModel("openrouter:bytedance/seedance-2.0");
    assert.ok(hailuo && seedance);

    // Hailuo 3 is $0.13/s → $0.195/s, clamped to the model's 5-15s.
    assert.equal(estimateCanvasModelCostUsd(hailuo), 0.975);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 2 }), 0.975);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 10 }), 1.95);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 15 }), 2.925);
    // Seedance 2.0 at 720p is $0.2268/s, and 30s clamps to the model's 15s max.
    assert.equal(estimateCanvasModelCostUsd(seedance, { durationSeconds: 30 }), 3.402);
  });

  it("prices Google AI Studio Gemini image and Omni video at the published price × 1.5", () => {
    const pro = findCanvasModel("google:gemini-3-pro-image");
    const lite = findCanvasModel("google:gemini-3.1-flash-lite-image");
    const omni = findCanvasModel("google:gemini-omni-1.2-flash");
    assert.ok(pro && lite && omni);
    assert.equal(estimateCanvasModelCostUsd(pro, { resolution: "2k" }), 0.201);
    assert.equal(estimateCanvasModelCostUsd(pro, { resolution: "4k", referenceImages: 1 }), 0.3617);
    assert.equal(estimateCanvasModelCostUsd(lite, { resolution: "4k" }), 0.0504);
    assert.equal(estimateCanvasModelCostUsd(omni), 1.043);
    assert.equal(estimateCanvasModelCostUsd(omni, { durationSeconds: 3 }), 0.3129);
    assert.equal(estimateCanvasModelCostUsd(omni, { durationSeconds: 20 }), 1.5645);
  });

  it("prices OpenRouter HeyGen Avatar IV at $0.075/s clamped to 5-120s", () => {
    const avatar = findCanvasModel("openrouter:heygen/avatar-iv");
    assert.ok(avatar);

    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 2 }), 0.375);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 5 }), 0.375);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 10 }), 0.75);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 90 }), 6.75);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 120 }), 9);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 200 }), 9);
  });

  it("prices the Director Frame like one Seedream 2K still", () => {
    const frame = findCanvasModel("scro:director-frame");
    assert.ok(frame);
    assert.equal(estimateCanvasModelCostUsd(frame), 0.135);
  });

  it("formats estimated costs cleanly with formatUsd", () => {
    const flux = findCanvasModel("mentalok:flux-schnell");
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro");
    assert.ok(flux && seedream);

    assert.equal(formatCanvasModelCostUsd(flux, { markup: 1.5 }), "$0.005");
    assert.equal(formatCanvasModelCostUsd(seedream), "$0.07");
  });

  it("prices Scro tools and FFmpeg utility nodes accurately", () => {
    const concat = findCanvasModel("ffmpeg:concat");
    const tts = findCanvasModel("scro:tts");
    const talking = findCanvasModel("scro:talking-head");
    const swap = findCanvasModel("scro:swap");
    const teleport = findCanvasModel("scro:teleport");
    const life = findCanvasModel("scro:life");
    const poster = findCanvasModel("scro:poster");
    const explainer = findCanvasModel("scro:explainer");
    assert.ok(concat && tts && talking && swap && teleport && life && poster && explainer);

    assert.equal(estimateCanvasModelCostUsd(concat), 0);
    assert.equal(estimateCanvasModelCostUsd(tts), 0.02);
    assert.equal(estimateCanvasModelCostUsd(talking, { durationSeconds: 90 }), 6.75);
    assert.equal(estimateCanvasModelCostUsd(swap, { durationSeconds: 6 }), 1.305);
    assert.equal(estimateCanvasModelCostUsd(teleport, { durationSeconds: 6 }), 1.305);
    assert.equal(estimateCanvasModelCostUsd(life), 0.135);
    assert.equal(estimateCanvasModelCostUsd(poster), 0.135);
    // 30s explainer = 5 Nano Banana 1K stills × $0.0504 + 30s × $0.195/s.
    assert.equal(estimateCanvasModelCostUsd(explainer, { durationSeconds: 30 }), 6.102);
  });

  it("prices scro:explainer-frame at one Nano Banana 1K still", () => {
    const frame = findCanvasModel("scro:explainer-frame");
    assert.ok(frame);
    assert.equal(frame.hiddenInSidebar, true);
    assert.equal(estimateCanvasModelCostUsd(frame), 0.0504);
  });

  it("prices swap-render like Swap and teleport-render without the plate image", () => {
    const swapRender = findCanvasModel("scro:swap-render");
    const teleportRender = findCanvasModel("scro:teleport-render");
    assert.ok(swapRender && teleportRender);
    assert.equal(swapRender.hiddenInSidebar, true);
    assert.equal(teleportRender.hiddenInSidebar, true);
    assert.equal(estimateCanvasModelCostUsd(swapRender, { durationSeconds: 6 }), 1.305);
    assert.equal(estimateCanvasModelCostUsd(teleportRender, { durationSeconds: 6 }), 1.17);
    assert.equal(estimateCanvasModelCostUsd(teleportRender, { durationSeconds: 20 }), 2.925);
    assert.equal(estimateCanvasModelCostUsd(teleportRender, { durationSeconds: 1 }), 0.39);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCanvasModel } from "@/service/canvas/model-catalog";
import {
  CANVAS_MIN_CHARGE_USD,
  canvasMentalokMarkup,
  estimateCanvasModelCostUsd,
  formatCanvasModelCostUsd,
} from "@/service/canvas/pricing";

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

  it("prices OpenRouter image models at flat $0.15", () => {
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro");
    const nanoBanana = findCanvasModel("openrouter:google/gemini-nano-banana-2.1");
    const gptImage = findCanvasModel("openrouter:openai/gpt-5-image");
    assert.ok(seedream && nanoBanana && gptImage);

    assert.equal(estimateCanvasModelCostUsd(seedream), 0.15);
    assert.equal(estimateCanvasModelCostUsd(nanoBanana), 0.15);
    assert.equal(estimateCanvasModelCostUsd(gptImage), 0.15);
  });

  it("prices OpenRouter standard video models at $0.10/s clamped to 5-15s", () => {
    const hailuo = findCanvasModel("openrouter:minimax/hailuo-3");
    const seedance = findCanvasModel("openrouter:bytedance/seedance-2.0");
    assert.ok(hailuo && seedance);

    assert.equal(estimateCanvasModelCostUsd(hailuo), 0.5);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 2 }), 0.5);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 10 }), 1.0);
    assert.equal(estimateCanvasModelCostUsd(hailuo, { durationSeconds: 15 }), 1.5);
    assert.equal(estimateCanvasModelCostUsd(seedance, { durationSeconds: 30 }), 1.5);
  });

  it("prices OpenRouter HeyGen Avatar IV at $0.18/s clamped to 5-60s", () => {
    const avatar = findCanvasModel("openrouter:heygen/avatar-iv");
    assert.ok(avatar);

    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 2 }), 0.9);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 5 }), 0.9);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 10 }), 1.8);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 60 }), 10.8);
    assert.equal(estimateCanvasModelCostUsd(avatar, { durationSeconds: 120 }), 10.8);
  });

  it("formats estimated costs cleanly with formatUsd", () => {
    const flux = findCanvasModel("mentalok:flux-schnell");
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro");
    assert.ok(flux && seedream);

    assert.equal(formatCanvasModelCostUsd(flux, { markup: 1.5 }), "$0.005");
    assert.equal(formatCanvasModelCostUsd(seedream), "$0.15");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasModelProvider } from "@/model/canvas-model";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import type { CanvasExecutorDeps } from "@/service/canvas/execution/jobs/deps";
import {
  CANVAS_PROVIDER_ADAPTERS,
  canvasProviderAdapter,
  dispatchAdapterFor,
  pollAdapterFor,
} from "@/service/canvas/execution/providers";
import { buildMentalokJobPayload } from "@/service/canvas/execution/providers/mentalok";

const PROVIDERS: CanvasModelProvider[] = ["mentalok", "openrouter", "google", "minimax", "scro", "ffmpeg"];

// Only the key checks are read by credentialError.
const noKeys = {
  hasMentalokKey: () => false,
  hasOpenRouterKey: () => false,
  hasMinimaxKey: () => false,
  hasGoogleStudioKey: () => false,
} as unknown as CanvasExecutorDeps;

describe("service/canvas/execution/providers", () => {
  it("registers one adapter per canvas provider", () => {
    for (const provider of PROVIDERS) {
      assert.equal(CANVAS_PROVIDER_ADAPTERS[provider].provider, provider);
      assert.equal(canvasProviderAdapter(provider), CANVAS_PROVIDER_ADAPTERS[provider]);
    }
    assert.equal(canvasProviderAdapter("toString"), undefined);
  });

  it("keeps the old fallbacks for unknown providers: send via Mentalok, poll via OpenRouter", () => {
    assert.equal(dispatchAdapterFor("legacy").provider, "mentalok");
    assert.equal(pollAdapterFor("legacy").provider, "openrouter");
  });

  it("picks presets from the model list only for Mentalok and FFmpeg", () => {
    const fromCatalog = PROVIDERS.filter((p) => CANVAS_PROVIDER_ADAPTERS[p].presetFromCatalog);
    assert.deepEqual(fromCatalog, ["mentalok", "ffmpeg"]);
  });

  it("reports a missing API key for keyed providers and none for FFmpeg", () => {
    const spec = findCanvasModel("ffmpeg:concat")!;
    assert.match(CANVAS_PROVIDER_ADAPTERS.openrouter.credentialError!(spec, noKeys)!, /OPENROUTER_API_KEY/);
    assert.match(CANVAS_PROVIDER_ADAPTERS.minimax.credentialError!(spec, noKeys)!, /MINIMAX_API_KEY/);
    assert.match(CANVAS_PROVIDER_ADAPTERS.google.credentialError!(spec, noKeys)!, /GOOGLE_GENERATIVE_AI_API_KEY/);
    assert.match(CANVAS_PROVIDER_ADAPTERS.mentalok.credentialError!(spec, noKeys)!, /MENTALOK_AI_STUDIO_API_KEY/);
    assert.equal(CANVAS_PROVIDER_ADAPTERS.ffmpeg.credentialError, undefined);
  });

  it("maps Mentalok keyframes for ref2va and imageUrl for single-frame models", async () => {
    const h3 = findCanvasModel("mentalok:minimax-h3-ref2va")!;
    const wan = findCanvasModel("mentalok:wan-2-1")!;
    const node = { id: "n1", type: "model" as const, position: { x: 0, y: 0 }, data: {} };
    const inputs = {
      prompt: "walk",
      startImage: "https://img/start.png",
      endImage: "https://img/end.png",
      refImages: [],
      videos: [],
    };
    const h3Payload = await buildMentalokJobPayload(h3, node, inputs, "p", async (u) => u);
    assert.deepEqual(h3Payload.keyframes, {
      startImage: "https://img/start.png",
      endImage: "https://img/end.png",
    });
    const wanPayload = await buildMentalokJobPayload(wan, node, inputs, "p", async (u) => u);
    assert.equal(wanPayload.keyframes, undefined);
    assert.equal(wanPayload.imageUrl, "https://img/start.png");
  });
});

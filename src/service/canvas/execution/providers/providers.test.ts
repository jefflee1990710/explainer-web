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
import type { CanvasDispatchContext } from "@/service/canvas/execution/providers/types";

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

  it("adds the wardrobe lock to every sync image model that gets a character reference", async () => {
    const cases = [
      { modelId: "google:gemini-nano-banana-2.1", submitKey: "submitGoogleStudioImage" },
      { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", submitKey: "submitOpenRouterImage" },
      { modelId: "minimax:MiniMax-H3-Image", submitKey: "submitMinimaxCanvasImage" },
    ] as const;
    for (const { modelId, submitKey } of cases) {
      const spec = findCanvasModel(modelId);
      assert.ok(spec, modelId);
      const sent: Array<{ prompt: string; referenceImageUrls?: Array<string | undefined> }> = [];
      // A failed reply stops dispatch right after the request, so nothing is persisted.
      const resolved = {
        [submitKey]: async (input: { prompt: string; referenceImageUrls?: Array<string | undefined> }) => {
          sent.push(input);
          return { request_id: "r1", status: "failed", error: "stop" };
        },
      } as unknown as CanvasExecutorDeps;
      const ctx = {
        spec,
        node: { id: "img", type: "model" as const, position: { x: 0, y: 0 }, data: { modelId } },
        inputs: {
          prompt: "Jim walks through a rainy street",
          refImages: ["https://img/office.png", "https://img/jim.png"],
          videos: [],
          characterRefPositions: [2],
        },
        resolved,
      } as unknown as CanvasDispatchContext;
      await assert.rejects(CANVAS_PROVIDER_ADAPTERS[spec.provider].dispatch(ctx), /stop/);
      assert.equal(sent.length, 1, modelId);
      assert.match(sent[0]!.prompt, /^Jim walks through a rainy street\n\nWARDROBE LOCK: Reference image 2 is the character;/);
      assert.deepEqual(sent[0]!.referenceImageUrls, ["https://img/office.png", "https://img/jim.png"]);
    }
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

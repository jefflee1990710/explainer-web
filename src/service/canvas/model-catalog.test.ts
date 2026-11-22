import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  STATIC_CANVAS_MODELS,
  clearMentalokCatalogCache,
  findCanvasModel,
  getCanvasModelCatalog,
} from "@/service/canvas/model-catalog";
import {
  OPENROUTER_ACCOUNT_IMAGE_MODELS,
  OPENROUTER_ACCOUNT_VIDEO_MODELS,
} from "@/service/openrouter/account-media-models";

describe("canvas model catalog", () => {
  beforeEach(() => {
    clearMentalokCatalogCache();
  });

  it("contains Mentalok, every account OpenRouter media model, Scro, and FFmpeg models with unique IDs", () => {
    const openRouterCount =
      OPENROUTER_ACCOUNT_IMAGE_MODELS.length + OPENROUTER_ACCOUNT_VIDEO_MODELS.length;
    // 7 sidebar Scro tools + 3 hidden step nodes.
    assert.equal(STATIC_CANVAS_MODELS.length, 16 + openRouterCount + 10 + 7);

    const ids = new Set(STATIC_CANVAS_MODELS.map((m) => m.id));
    assert.equal(ids.size, STATIC_CANVAS_MODELS.length);

    const mentalok = STATIC_CANVAS_MODELS.filter((m) => m.provider === "mentalok");
    const openrouter = STATIC_CANVAS_MODELS.filter((m) => m.provider === "openrouter");
    const scro = STATIC_CANVAS_MODELS.filter((m) => m.provider === "scro");
    const ffmpeg = STATIC_CANVAS_MODELS.filter((m) => m.provider === "ffmpeg");
    assert.equal(mentalok.length, 16);
    assert.equal(openrouter.length, openRouterCount);
    assert.equal(scro.length, 10);
    assert.deepEqual(
      scro.filter((m) => m.hiddenInSidebar).map((m) => m.id),
      ["scro:explainer-frame", "scro:swap-render", "scro:teleport-render"],
    );
    assert.equal(ffmpeg.length, 7);

    for (const model of STATIC_CANVAS_MODELS) {
      assert.ok(model.presets.length > 0, `model ${model.id} must have presets`);
      assert.ok(model.inputs.length > 0, `model ${model.id} must have inputs`);
      assert.ok(model.output.label.length > 0);
      assert.ok(model.output.labels["zh-Hant"].length > 0);
      assert.ok(model.output.labels.en.length > 0);
      for (const port of model.inputs) {
        assert.ok(port.label.length > 0, `port ${port.id} on ${model.id} needs label`);
        assert.ok(port.labels["zh-Hant"].length > 0);
        assert.ok(port.labels.en.length > 0);
        assert.ok(port.maxConnections >= 1);
      }
    }
  });

  it("matches exact Mentalok providerModelIds, categories, basePriceUsd, ports, and presets from spec", () => {
    const expectedMentalok: Array<{
      slug: string;
      category: string;
      output: "image" | "video";
      price: number;
      presets: string[];
      inputIds: string[];
    }> = [
      {
        slug: "flux-schnell",
        category: "image",
        output: "image",
        price: 0.0012,
        presets: ["flux-square-1024", "flux-portrait-768", "flux-landscape-1024"],
        inputIds: ["prompt"],
      },
      {
        slug: "sdxl-lightning",
        category: "image",
        output: "image",
        price: 0.0008,
        presets: ["sdxl-square-1024", "sdxl-portrait-832", "sdxl-landscape-1216"],
        inputIds: ["prompt"],
      },
      {
        slug: "flux-2-klein-4b",
        category: "image",
        output: "image",
        price: 0.0012,
        presets: ["flux2-klein-square", "flux2-klein-portrait", "flux2-klein-landscape"],
        inputIds: ["prompt"],
      },
      {
        slug: "minimax-h3-image",
        category: "image",
        output: "image",
        price: 0.015,
        presets: ["h3-image-2k", "h3-image-portrait", "h3-image-landscape", "h3-image-4k"],
        inputIds: ["prompt", "refImages"],
      },
      {
        slug: "wan-2-1",
        category: "video",
        output: "video",
        price: 0.08,
        presets: ["wan-480p", "wan-720p"],
        inputIds: ["prompt", "startImage"],
      },
      {
        slug: "ltx-video",
        category: "video",
        output: "video",
        price: 0.035,
        presets: ["ltx-standard-768", "ltx-landscape-960"],
        inputIds: ["prompt", "startImage"],
      },
      {
        slug: "wan-2-2",
        category: "video",
        output: "video",
        price: 0.08,
        presets: ["wan22-720p", "wan22-480p", "wan22-portrait"],
        inputIds: ["prompt", "startImage"],
      },
      {
        slug: "ltx-2-5",
        category: "video",
        output: "video",
        price: 0.045,
        presets: ["ltx25-720p", "ltx25-480p", "ltx25-portrait"],
        inputIds: ["prompt", "startImage", "endImage"],
      },
      {
        slug: "minimax-h3-ref2va",
        category: "video",
        output: "video",
        price: 0.21,
        presets: ["h3-ref2va-480p", "h3-ref2va-768p", "h3-ref2va-portrait"],
        inputIds: ["prompt", "startImage", "endImage", "refImages", "refAudio"],
      },
      {
        slug: "qwen-image-edit-2511",
        category: "editing",
        output: "image",
        price: 0.012,
        presets: ["qwen-edit-4step", "qwen-edit-8step"],
        inputIds: ["prompt", "image", "refImages"],
      },
      {
        slug: "sam-3-1",
        category: "segmentation",
        output: "image",
        price: 0.0012,
        presets: ["sam31-standard", "sam31-hq", "sam31-fast"],
        inputIds: ["prompt", "image"],
      },
      {
        slug: "sam-3-1-video",
        category: "segmentation",
        output: "video",
        price: 0.015,
        presets: ["sam31-vid-standard", "sam31-vid-hq", "sam31-vid-fast"],
        inputIds: ["prompt", "video"],
      },
      {
        slug: "birefnet",
        category: "segmentation",
        output: "image",
        price: 0.0008,
        presets: ["birefnet-auto"],
        inputIds: ["image"],
      },
      {
        slug: "seedvr2-image",
        category: "upscale",
        output: "image",
        price: 0.004,
        presets: ["seedvr2-img-2x", "seedvr2-img-4x", "seedvr2-img-1x"],
        inputIds: ["image"],
      },
      {
        slug: "seedvr2-video",
        category: "upscale",
        output: "video",
        price: 0.035,
        presets: ["seedvr2-vid-2x", "seedvr2-vid-1x"],
        inputIds: ["video"],
      },
      {
        slug: "relayvsr",
        category: "upscale",
        output: "video",
        price: 0.015,
        presets: ["relayvsr-2x"],
        inputIds: ["video"],
      },
    ];

    for (const exp of expectedMentalok) {
      const model = findCanvasModel(`mentalok:${exp.slug}`);
      assert.ok(model, `missing mentalok:${exp.slug}`);
      assert.equal(model.providerModelId, exp.slug);
      assert.equal(model.category, exp.category);
      assert.equal(model.output.type, exp.output);
      assert.equal(model.basePriceUsd, exp.price);
      assert.deepEqual(model.presets, exp.presets);
      assert.deepEqual(
        model.inputs.map((p) => p.id),
        exp.inputIds,
      );
    }

    // Spot-check critical port constraints
    const qwenEdit = findCanvasModel("mentalok:qwen-image-edit-2511");
    assert.equal(qwenEdit?.inputs.find((p) => p.id === "image")?.required, true);
    assert.equal(qwenEdit?.inputs.find((p) => p.id === "refImages")?.maxConnections, 3);

    const h3Img = findCanvasModel("mentalok:minimax-h3-image");
    assert.equal(h3Img?.inputs.find((p) => p.id === "refImages")?.maxConnections, 4);

    const h3Ref2va = findCanvasModel("mentalok:minimax-h3-ref2va");
    assert.equal(h3Ref2va?.inputs.find((p) => p.id === "refImages")?.maxConnections, 4);
    assert.equal(h3Ref2va?.inputs.find((p) => p.id === "refAudio")?.type, "audio");
  });

  it("matches exact OpenRouter providerModelIds, categories, and port limits from spec", () => {
    const expectedOpenRouter: Array<{
      slug: string;
      category: "image" | "video";
      output: "image" | "video";
      refMax?: number;
    }> = [
      { slug: "bytedance-seed/seedream-5-0-pro", category: "image", output: "image", refMax: 14 },
      { slug: "bytedance-seed/seedream-5-0-lite", category: "image", output: "image", refMax: 14 },
      { slug: "bytedance-seed/seedream-5-5", category: "image", output: "image", refMax: 10 },
      { slug: "minimax/hailuo-3", category: "video", output: "video", refMax: 4 },
      { slug: "bytedance/seedance-2.0", category: "video", output: "video", refMax: 4 },
      { slug: "bytedance/seedance-2.0-fast", category: "video", output: "video", refMax: 4 },
      { slug: "bytedance/seedance-2.0-mini", category: "video", output: "video", refMax: 4 },
      { slug: "alibaba/wan-3.0", category: "video", output: "video" },
      { slug: "heygen/avatar-iv", category: "video", output: "video" },
    ];

    for (const exp of expectedOpenRouter) {
      const model = findCanvasModel(`openrouter:${exp.slug}`);
      assert.ok(model, `missing openrouter:${exp.slug}`);
      assert.equal(model.providerModelId, exp.slug);
      assert.equal(model.category, exp.category);
      assert.equal(model.output.type, exp.output);
      if (exp.refMax !== undefined) {
        const refPort = model.inputs.find((p) => p.id === "refImages");
        assert.ok(refPort, `${exp.slug} should have refImages port`);
        assert.equal(refPort.multiple, true);
        assert.equal(refPort.maxConnections, exp.refMax);
      }
    }

    assert.equal(findCanvasModel("openrouter:openai/gpt-5-image"), undefined);
    assert.equal(findCanvasModel("openrouter:openai/gpt-5-image-mini"), undefined);
    assert.equal(findCanvasModel("openrouter:google/gemini-nano-banana-2.1"), undefined);
    assert.equal(findCanvasModel("openrouter:openai/gpt-image-2"), undefined);
    assert.equal(findCanvasModel("openrouter:google/veo-3.1"), undefined);
    assert.equal(findCanvasModel("openrouter:google/veo-3.1-fast"), undefined);

    const avatar = findCanvasModel("openrouter:heygen/avatar-iv");
    assert.equal(avatar?.inputs.find((p) => p.id === "startImage")?.required, true);
    assert.equal(avatar?.inputs.find((p) => p.id === "refAudio")?.required, true);
    assert.equal(avatar?.inputs.find((p) => p.id === "prompt")?.required, false);
  });

  it("merges live Mentalok pricing, presets, and status with 60s TTL cache", async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          models: [
            {
              id: "flux-schnell",
              name: "FLUX.1 [schnell]",
              category: "IMAGE",
              priceUsd: 0.0025,
              status: "warm",
              presets: ["flux-square-1024", "flux-hd-1440"],
            },
            {
              id: "wan-2-2",
              name: "Wan 2.2 TI2V-5B",
              category: "VIDEO",
              priceUsd: 0.09,
              status: "unavailable",
              presets: ["wan22-720p"],
            },
          ],
        }),
        { status: 200 },
      );
    };

    const t0 = 1_700_000_000_000;
    const first = await getCanvasModelCatalog({
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
      now: t0,
    });
    assert.equal(calls, 1);

    const flux = findCanvasModel("mentalok:flux-schnell", first);
    assert.equal(flux?.basePriceUsd, 0.0025);
    assert.equal(flux?.runtimeStatus, "warm");
    assert.equal(flux?.available, true);
    assert.deepEqual(flux?.presets, ["flux-square-1024", "flux-hd-1440"]);

    const wan22 = findCanvasModel("mentalok:wan-2-2", first);
    assert.equal(wan22?.basePriceUsd, 0.09);
    assert.equal(wan22?.runtimeStatus, "unavailable");
    assert.equal(wan22?.available, false);

    // Within 60s TTL -> reuses cache without calling fetch again
    const cached = await getCanvasModelCatalog({
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
      now: t0 + 30_000,
    });
    assert.equal(calls, 1);
    assert.equal(findCanvasModel("mentalok:flux-schnell", cached)?.basePriceUsd, 0.0025);

    // After 60s TTL -> refetches
    await getCanvasModelCatalog({
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
      now: t0 + 61_000,
    });
    assert.equal(calls, 2);
  });

  it("falls back cleanly when API key is missing or live fetch fails", async () => {
    let called = false;
    const withoutKey = await getCanvasModelCatalog({
      apiKey: "",
      fetch: async () => {
        called = true;
        return new Response("{}");
      },
    });
    assert.equal(called, false);
    assert.equal(withoutKey.length, STATIC_CANVAS_MODELS.length);
    assert.equal(findCanvasModel("mentalok:flux-schnell", withoutKey)?.runtimeStatus, "unavailable");
    assert.equal(findCanvasModel("mentalok:flux-schnell", withoutKey)?.available, false);
    assert.equal(findCanvasModel("openrouter:minimax/hailuo-3", withoutKey)?.available, true);

    const afterError = await getCanvasModelCatalog({
      apiKey: "mtk_live_test",
      fetch: async () => {
        throw new Error("network unreachable");
      },
    });
    assert.equal(afterError.length, STATIC_CANVAS_MODELS.length);
    assert.equal(findCanvasModel("mentalok:flux-schnell", afterError)?.basePriceUsd, 0.0012);
  });

  it("exposes Scro tool and FFmpeg specs with audio output and multi-video ports", () => {
    const talking = findCanvasModel("scro:talking-head");
    assert.ok(talking);
    assert.equal(talking.provider, "scro");
    assert.equal(talking.output.type, "video");
    assert.equal(talking.maxDurationSeconds, 120);

    const tts = findCanvasModel("scro:tts");
    assert.ok(tts);
    assert.equal(tts.provider, "scro");
    assert.equal(tts.output.type, "audio");

    const concat = findCanvasModel("ffmpeg:concat");
    assert.ok(concat);
    assert.equal(concat.provider, "ffmpeg");
    const videosPort = concat.inputs.find((p) => p.id === "videos");
    assert.ok(videosPort);
    assert.equal(videosPort.type, "video");
    assert.equal(videosPort.multiple, true);
    assert.equal(videosPort.maxConnections, 8);
    assert.equal(videosPort.required, true);

    const extractAudio = findCanvasModel("ffmpeg:extract-audio");
    assert.ok(extractAudio);
    assert.equal(extractAudio.provider, "ffmpeg");
    assert.equal(extractAudio.output.type, "audio");
  });
});

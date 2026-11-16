import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EXPLAINER_FRAME_IMAGE_ROUTE,
  IMAGE_ROUTE_BY_SCENE_TEXT,
  NANO_BANANA_2_1_IMAGE_MODEL,
  SEEDREAM_5_PRO_IMAGE_MODEL,
  imageModelForRealism,
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import { submitImage } from "@/service/higgsfield/generate";

test("scene-text routes use Seedream 5.0 Pro", () => {
  assert.equal(SEEDREAM_5_PRO_IMAGE_MODEL, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].editModel, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].editModel, "bytedance-seed/seedream-5-0-pro");
});

test("generation looks up the route and keeps Seedream when frames have references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(en, true), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(hant, false), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(hant, true), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageRouteForSceneText(undefined).model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageRouteForSceneText(undefined).backend, "openrouter");
});

test("realistic and illustrated stills both use Seedream 5.0 Pro", () => {
  assert.equal(imageModelForRealism(true), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForRealism(false), "bytedance-seed/seedream-5-0-pro");
});

test("resolveImageRoute requires OPENROUTER_API_KEY for OpenRouter routes", () => {
  const prev = process.env.OPENROUTER_API_KEY;
  try {
    delete process.env.OPENROUTER_API_KEY;
    assert.throws(() => resolveImageRoute("en"), /OPENROUTER_API_KEY/);

    process.env.OPENROUTER_API_KEY = "sk-or-test";
    assert.equal(resolveImageRoute("en").model, "bytedance-seed/seedream-5-0-pro");
    assert.equal(
      resolveImageRoute("zh-Hant", "cartoon-explainer-video-director").model,
      "google/gemini-nano-banana-2.1",
    );
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev;
  }
});

test("explainer-type directors route frame images to Nano Banana 2.1 while others stay on Seedream 5.0 Pro", () => {
  assert.equal(NANO_BANANA_2_1_IMAGE_MODEL, "google/gemini-nano-banana-2.1");
  assert.equal(EXPLAINER_FRAME_IMAGE_ROUTE.backend, "openrouter");
  assert.equal(EXPLAINER_FRAME_IMAGE_ROUTE.model, "google/gemini-nano-banana-2.1");
  assert.equal(EXPLAINER_FRAME_IMAGE_ROUTE.editModel, "google/gemini-nano-banana-2.1");

  for (const slug of [
    "cartoon-explainer-video-director",
    "paper-cutout-explainer-video-director",
    "papercraft-diorama-director",
  ]) {
    assert.equal(imageRouteForSceneText("en", slug).model, "google/gemini-nano-banana-2.1");
    assert.equal(imageRouteForSceneText("zh-Hant", slug).editModel, "google/gemini-nano-banana-2.1");
  }

  for (const slug of ["talking-head-director", "story-short-director", "one-take-director"]) {
    assert.equal(imageRouteForSceneText("en", slug).model, "bytedance-seed/seedream-5-0-pro");
    assert.equal(imageRouteForSceneText("zh-Hant", slug).editModel, "bytedance-seed/seedream-5-0-pro");
  }
});

test("submitImage preserves Nano Banana 2.1 for explainer frames and falls back to explainer route when skillSlug is an explainer", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const originalFetch = globalThis.fetch;
  const postedModels: string[] = [];

  process.env.OPENROUTER_API_KEY = "sk-or-test";
  globalThis.fetch = (async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { model: string };
    postedModels.push(payload.model);
    return new Response(
      JSON.stringify({
        id: "img-job-1",
        data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await submitImage({
      model: NANO_BANANA_2_1_IMAGE_MODEL,
      prompt: "draw whiteboard explainer frame",
      aspectRatio: "9:16",
      sceneTextLanguage: "zh-Hant",
      skillSlug: "cartoon-explainer-video-director",
    });
    await submitImage({
      model: "alibaba/qwen-image-3/text-to-image",
      prompt: "draw papercraft explainer frame",
      aspectRatio: "9:16",
      sceneTextLanguage: "zh-Hant",
      skillSlug: "papercraft-diorama-director",
    });
    await submitImage({
      model: NANO_BANANA_2_1_IMAGE_MODEL,
      prompt: "explicit nano banana call",
      aspectRatio: "16:9",
      sceneTextLanguage: "en",
    });
    await submitImage({
      model: "alibaba/qwen-image-3/text-to-image",
      prompt: "non-explainer frame",
      aspectRatio: "9:16",
      sceneTextLanguage: "zh-Hant",
      skillSlug: "talking-head-director",
    });

    assert.deepEqual(postedModels, [
      "google/gemini-nano-banana-2.1",
      "google/gemini-nano-banana-2.1",
      "google/gemini-nano-banana-2.1",
      "bytedance-seed/seedream-5-0-pro",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_ROUTE_BY_SCENE_TEXT,
  NANO_BANANA_PRO_IMAGE_MODEL,
  SEEDREAM_5_PRO_IMAGE_MODEL,
  imageModelForRealism,
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";

test("scene-text routes use Seedream 5.0 Pro", () => {
  assert.equal(NANO_BANANA_PRO_IMAGE_MODEL, "google/gemini-3-pro-image");
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
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev;
  }
});

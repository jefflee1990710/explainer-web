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

test("scene-text routes use Nano Banana Pro; illustrated boards stay on Seedream", () => {
  assert.equal(NANO_BANANA_PRO_IMAGE_MODEL, "google/gemini-3-pro-image");
  assert.equal(SEEDREAM_5_PRO_IMAGE_MODEL, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "google/gemini-3-pro-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "google/gemini-3-pro-image");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "google/gemini-3-pro-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].editModel, "google/gemini-3-pro-image");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "google/gemini-3-pro-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].editModel, "google/gemini-3-pro-image");
});

test("generation looks up the route and keeps Nano Banana Pro when frames have references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "google/gemini-3-pro-image");
  assert.equal(imageModelForSubmit(en, true), "google/gemini-3-pro-image");
  assert.equal(imageModelForSubmit(hant, false), "google/gemini-3-pro-image");
  assert.equal(imageModelForSubmit(hant, true), "google/gemini-3-pro-image");
  assert.equal(imageRouteForSceneText(undefined).model, "google/gemini-3-pro-image");
  assert.equal(imageRouteForSceneText(undefined).backend, "openrouter");
});

test("realistic stills use Nano Banana Pro and illustrated stills stay on Seedream", () => {
  assert.equal(imageModelForRealism(true), "google/gemini-3-pro-image");
  assert.equal(imageModelForRealism(false), "bytedance-seed/seedream-5-0-pro");
});

test("resolveImageRoute requires OPENROUTER_API_KEY for OpenRouter routes", () => {
  const prev = process.env.OPENROUTER_API_KEY;
  try {
    delete process.env.OPENROUTER_API_KEY;
    assert.throws(() => resolveImageRoute("en"), /OPENROUTER_API_KEY/);

    process.env.OPENROUTER_API_KEY = "sk-or-test";
    assert.equal(resolveImageRoute("en").model, "google/gemini-3-pro-image");
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev;
  }
});

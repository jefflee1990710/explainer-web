import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_ROUTE_BY_SCENE_TEXT,
  imageModelForSubmit,
  imageRouteForSceneText,
} from "@/service/generation/image-backend";

test("each scene-text language uses a Higgsfield model that accepts blueprint refs", () => {
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "higgsfield");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "marketing-studio/image/flare");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "marketing-studio/image/flare");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "higgsfield");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "xai/grok-imagine-image-2.0");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].editModel, "xai/grok-imagine-image-2.0");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].backend, "higgsfield");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "marketing-studio/image/sunburst");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].editModel, "marketing-studio/image/sunburst");
});

test("generation looks up the route and keeps Grok Image when Cantonese frames have references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "marketing-studio/image/flare");
  assert.equal(imageModelForSubmit(en, true), "marketing-studio/image/flare");
  assert.equal(imageModelForSubmit(hant, false), "xai/grok-imagine-image-2.0");
  assert.equal(imageModelForSubmit(hant, true), "xai/grok-imagine-image-2.0");
  assert.equal(imageRouteForSceneText(undefined).model, "marketing-studio/image/flare");
  assert.equal(imageRouteForSceneText(undefined).backend, "higgsfield");
});

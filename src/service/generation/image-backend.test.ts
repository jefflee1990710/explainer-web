import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_ROUTE_BY_SCENE_TEXT,
  imageModelForSubmit,
  imageRouteForSceneText,
} from "@/service/generation/image-backend";

test("each scene-text language has backend and model names", () => {
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "higgsfield");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "alibaba/qwen-image-3/text-to-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "alibaba/qwen-image-3/edit");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "alicloud");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "qwen-image-3.0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "qwen-image-3.0-pro");
});

test("generation looks up the route and picks t2i vs edit model", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "alibaba/qwen-image-3/text-to-image");
  assert.equal(imageModelForSubmit(en, true), "alibaba/qwen-image-3/edit");
  assert.equal(imageModelForSubmit(hant, false), "qwen-image-3.0-pro");
  assert.equal(imageModelForSubmit(hant, true), "qwen-image-3.0-pro");
  assert.equal(imageRouteForSceneText(undefined).backend, "higgsfield");
});

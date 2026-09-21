import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_BACKEND_BY_SCENE_TEXT,
  imageBackendForSceneText,
  imageJobModel,
} from "./image-backend";

test("scene-text language maps to one image backend each", () => {
  assert.equal(IMAGE_BACKEND_BY_SCENE_TEXT.en, "higgsfield");
  assert.equal(IMAGE_BACKEND_BY_SCENE_TEXT["zh-Hant"], "alicloud");
  assert.equal(IMAGE_BACKEND_BY_SCENE_TEXT["zh-Hans"], "alicloud");
  assert.equal(imageBackendForSceneText("en"), "higgsfield");
  assert.equal(imageBackendForSceneText("zh-Hant"), "alicloud");
  assert.equal(imageBackendForSceneText("zh-Hans"), "alicloud");
  assert.equal(imageBackendForSceneText(undefined), "higgsfield");
});

test("job model id follows the backend", () => {
  assert.equal(imageJobModel("alicloud", "alibaba/qwen-image-3/text-to-image"), "qwen-image-3.0-pro");
  assert.equal(
    imageJobModel("higgsfield", "alibaba/qwen-image-3/text-to-image"),
    "alibaba/qwen-image-3/text-to-image",
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { canvasModelLogo } from "@/app/app/canvas/model-logo";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";

test("every canvas model resolves a brand mark", () => {
  const missing = STATIC_CANVAS_MODELS.filter((spec) => !canvasModelLogo(spec.providerModelId)).map(
    (spec) => spec.providerModelId,
  );
  assert.deepEqual(missing, []);
});

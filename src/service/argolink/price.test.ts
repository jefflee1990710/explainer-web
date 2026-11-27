import assert from "node:assert/strict";
import test from "node:test";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { argolinkVideoUserUsd } from "@/service/argolink/price";

test("MAGI-2 bills ArgoLink's $0.068 per second plus 50 percent", () => {
  assert.equal(argolinkVideoUserUsd("magi-2", { durationSeconds: 5 }), 0.51);
  assert.equal(argolinkVideoUserUsd("magi-2", { durationSeconds: 4 }), 0.408);
  assert.equal(argolinkVideoUserUsd("magi-2", { durationSeconds: 30 }), 3.06);
  const spec = findCanvasModel("argolink:magi-2");
  assert.ok(spec);
  assert.equal(spec.provider, "argolink");
  assert.equal(estimateCanvasModelCostUsd(spec), 0.51);
  assert.equal(estimateCanvasModelCostUsd(spec, { durationSeconds: 12, referenceImages: 10 }), 1.224);
  assert.equal(estimateCanvasModelCostUsd(spec, { durationSeconds: 1 }), 0.408);
});

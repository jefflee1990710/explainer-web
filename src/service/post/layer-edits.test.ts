import assert from "node:assert/strict";
import { test } from "node:test";
import { posterLayout } from "@/service/post/layouts";
import { applyPosterCopy } from "@/service/post/copy";
import { mergeLayerEdits } from "@/service/post/layer-edits";

test("an unknown layer id is rejected", () => {
  const layers = applyPosterCopy(posterLayout("layout-16"), { "layout-16-headline": "Hi" });
  const result = mergeLayerEdits(
    layers,
    layers.map((layer) => ({ id: layer.id === layers[0].id ? "nope" : layer.id, x: 1, y: 1, w: 80, h: 80 })),
  );
  assert.deepEqual(result, { ok: false, error: "unknown_layer" });
});

test("edits move a shape and keep its fill", () => {
  const layers = posterLayout("layout-16").layers;
  const result = mergeLayerEdits(
    layers,
    layers.map((layer) => ({
      id: layer.id,
      x: layer.id === "layout-16-oval" ? 100 : layer.x,
      y: layer.y,
      w: layer.w,
      h: layer.h,
      text: layer.type === "text" ? "Hello" : undefined,
    })),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const oval = result.layers.find((layer) => layer.id === "layout-16-oval");
  assert.equal(oval?.type, "shape");
  if (oval?.type === "shape") {
    assert.equal(oval.x, 100);
    assert.equal(oval.fill, "#C6F24B");
    assert.equal(oval.shape, "ellipse");
  }
});

test("edited headline text is truncated", () => {
  const layers = posterLayout("layout-16").layers;
  const result = mergeLayerEdits(
    layers,
    layers.map((layer) => ({
      id: layer.id,
      x: layer.x,
      y: layer.y,
      w: layer.w,
      h: layer.h,
      text: layer.type === "text" ? "x".repeat(80) : undefined,
    })),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const headline = result.layers.find((layer) => layer.type === "text");
  if (headline?.type === "text") assert.equal(headline.text.length, 40);
});

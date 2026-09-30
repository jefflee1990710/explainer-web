import assert from "node:assert/strict";
import { test } from "node:test";
import { previewStageFit } from "@/presentation/components/project/clip-preview-fit";

test("a tall 9:16 row shrinks width so it fits the pane height", () => {
  const fit = previewStageFit({
    aspectRatio: "9:16",
    containerWidth: 1200,
    containerHeight: 400,
    gap: 16,
    caption: 28,
  });
  assert.ok(fit.rowHeight <= 400);
  assert.ok(fit.rowWidth < 1200);
  assert.equal(fit.start.height, fit.video.height);
  assert.ok(fit.start.width < fit.video.width);
});

test("a wide 16:9 row uses the pane width and stays inside the height", () => {
  const fit = previewStageFit({
    aspectRatio: "16:9",
    containerWidth: 900,
    containerHeight: 800,
    gap: 16,
    caption: 28,
  });
  assert.ok(fit.rowWidth <= 900);
  assert.ok(fit.rowHeight < 800);
  assert.ok(Math.abs(fit.rowWidth - 900) < 1);
});

test("empty container yields zero boxes", () => {
  const fit = previewStageFit({
    aspectRatio: "1:1",
    containerWidth: 0,
    containerHeight: 0,
  });
  assert.equal(fit.start.width, 0);
  assert.equal(fit.video.height, 0);
});

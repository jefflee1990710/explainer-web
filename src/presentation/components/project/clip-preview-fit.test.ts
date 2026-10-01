import assert from "node:assert/strict";
import { test } from "node:test";
import { previewStageFit } from "@/presentation/components/project/clip-preview-fit";

test("a tall 9:16 row keeps the video inside the pane and taller than the stills", () => {
  const fit = previewStageFit({
    aspectRatio: "9:16",
    containerWidth: 1200,
    containerHeight: 400,
    gap: 16,
    caption: 28,
  });
  assert.ok(fit.rowHeight <= 400);
  assert.ok(fit.rowWidth <= 1200);
  assert.ok(fit.video.height > fit.start.height);
  assert.ok(Math.abs(fit.video.width / fit.video.height - 9 / 16) < 0.02);
});

test("a roomy pane makes a 9:16 video higher than a wide slot", () => {
  const fit = previewStageFit({
    aspectRatio: "9:16",
    containerWidth: 1400,
    containerHeight: 1200,
    gap: 16,
    caption: 28,
  });
  assert.ok(fit.video.height > 700);
  assert.ok(fit.video.height > fit.start.height);
  assert.ok(fit.rowHeight <= 1200);
  assert.ok(fit.rowWidth <= 1400);
});

test("a wide 16:9 row uses the pane width and keeps the clip taller than the stills", () => {
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
  assert.ok(fit.video.height > fit.start.height);
  assert.ok(Math.abs(fit.video.width / fit.video.height - 16 / 9) < 0.02);
});

test("a roomy pane makes a 16:9 video higher than a short wide slot", () => {
  const fit = previewStageFit({
    aspectRatio: "16:9",
    containerWidth: 1400,
    containerHeight: 1400,
    gap: 16,
    caption: 28,
  });
  assert.ok(fit.video.height > 400);
  assert.ok(fit.video.height > fit.start.height);
  assert.ok(fit.rowHeight <= 1400);
  assert.ok(fit.rowWidth <= 1400);
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

import assert from "node:assert/strict";
import { test } from "node:test";
import { previewSubtitleSrc } from "@/presentation/components/project/clip-preview-subtitle";

const plate = {
  subtitleOverlay: true,
  baked: false,
  posterHasSubtitle: false,
  plateStatus: "completed",
  plateUrl: "plate.png",
};

test("a generating clip does not show the subtitle plate by itself", () => {
  assert.equal(previewSubtitleSrc(plate), undefined);
});

test("a clean scene still still gets the plate on top", () => {
  assert.equal(previewSubtitleSrc({ ...plate, posterSrc: "scene.png" }), "plate.png");
});

test("a merged still does not stack the plate again", () => {
  assert.equal(
    previewSubtitleSrc({ ...plate, posterSrc: "merged.png", posterHasSubtitle: true }),
    undefined,
  );
});

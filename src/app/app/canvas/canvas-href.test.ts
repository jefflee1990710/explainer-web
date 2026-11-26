import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canvasPageHref } from "@/app/app/canvas/canvas-href";

const ID = "674a1b2c3d4e5f6789012345";

describe("canvasPageHref", () => {
  it("puts the canvas id in the URL", () => {
    assert.equal(canvasPageHref(ID), `/app/canvas?id=${ID}`);
  });

  it("replaces an old id and keeps other params", () => {
    assert.equal(
      canvasPageHref(ID, "id=old&hl=zh-Hant"),
      `/app/canvas?id=${ID}&hl=zh-Hant`,
    );
  });

  it("drops the one-shot template param", () => {
    assert.equal(canvasPageHref(ID, { template: "explainer", hl: "en" }), `/app/canvas?hl=en&id=${ID}`);
  });
});

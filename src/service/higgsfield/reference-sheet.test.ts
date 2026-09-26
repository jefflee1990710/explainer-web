import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  referenceGroups,
  referenceLimitForModel,
  stackReferenceSheet,
} from "@/service/higgsfield/reference-sheet";

test("language models accept more than one blueprint reference", () => {
  assert.equal(referenceLimitForModel("marketing-studio/image/flare"), 16);
  assert.equal(referenceLimitForModel("marketing-studio/image/sunburst"), 16);
  assert.equal(referenceLimitForModel("alibaba/qwen-image-3/edit"), 3);
});

test("reference groups stay separate until the model cap", () => {
  assert.equal(referenceGroups(["a", "b", "c"], 3), "urls");
  assert.equal(referenceGroups(["a", "b", "c", "d"], 3), "sheet");
  assert.equal(referenceGroups(["a"], 0), "none");
});

test("stackReferenceSheet places every blueprint on one row", async () => {
  const red = await sharp({
    create: { width: 20, height: 10, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: { width: 30, height: 10, channels: 3, background: "#0000ff" },
  })
    .png()
    .toBuffer();
  const sheet = await stackReferenceSheet([red, blue]);
  const meta = await sharp(sheet).metadata();
  assert.equal(meta.width, 50);
  assert.equal(meta.height, 10);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STYLE_ID,
  PICKER_DEFAULT_STYLE_ID,
  STYLE_IDS,
  isStyleId,
  pickerDefaultStyleId,
  resolveStyleId,
} from "@/model/style-id";

test("pickers default to realistic when it is offered, else the first offered style", () => {
  assert.equal(PICKER_DEFAULT_STYLE_ID, "realistic");
  assert.equal(pickerDefaultStyleId([{ id: "doodle" }, { id: "realistic" }]), "realistic");
  assert.equal(pickerDefaultStyleId([{ id: "doodle" }, { id: "pixel" }]), "doodle");
  assert.equal(pickerDefaultStyleId([]), "realistic");
});

test("STYLE_IDS lists every allowed style id", () => {
  assert.deepEqual(STYLE_IDS, [
    "doodle",
    "flat-vector",
    "paper-cutout",
    "chalkboard",
    "chalkboard-color",
    "watercolor",
    "clay",
    "pixel",
    "ink-manga",
    "realistic",
    "low-poly",
    "colored-pencil",
    "dark-tech",
    "cave-painting",
    "egyptian-wall",
    "attic-black-figure",
    "roman-mosaic",
    "gothic-illumination",
    "high-renaissance",
    "ukiyo-e",
    "impressionism",
    "post-impressionism",
    "art-nouveau",
    "cubism",
    "bauhaus",
    "pop-art",
    "eight-bit",
    "ray-traced",
    "flat-illustration",
    "cream-poster",
    "highlighter-notes",
    "grid-icons",
    "proof-poster",
    "data-ring",
    "wireframe-breakdown",
  ]);
});

test("isStyleId accepts only allowed ids", () => {
  assert.equal(isStyleId("pixel"), true);
  assert.equal(isStyleId("chalkboard-color"), true);
  assert.equal(isStyleId("nope"), false);
  assert.equal(isStyleId(undefined), false);
});

test("resolveStyleId falls back to doodle", () => {
  assert.equal(resolveStyleId(undefined), DEFAULT_STYLE_ID);
  assert.equal(resolveStyleId("nope"), "doodle");
  assert.equal(resolveStyleId("pixel"), "pixel");
});

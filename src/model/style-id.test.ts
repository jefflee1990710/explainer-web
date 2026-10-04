import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  isStyleId,
  resolveStyleId,
} from "@/model/style-id";

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

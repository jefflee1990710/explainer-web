import assert from "node:assert/strict";
import { test } from "node:test";
import { studioRailCollapsed } from "@/presentation/studio/studio-rail-mode";

test("a saved choice wins on every page", () => {
  assert.equal(studioRailCollapsed("1", false), true);
  assert.equal(studioRailCollapsed("1", true), true);
  assert.equal(studioRailCollapsed("0", true), false);
  assert.equal(studioRailCollapsed("0", false), false);
});

test("canvas starts as icons and other pages start full width", () => {
  assert.equal(studioRailCollapsed(null, true), true);
  assert.equal(studioRailCollapsed(null, false), false);
});

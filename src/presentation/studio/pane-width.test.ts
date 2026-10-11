import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INSPECTOR_WIDTH_DEFAULT,
  PANE_WIDTH_MAX,
  PANE_WIDTH_MIN,
  SCENE_CHAT_WIDTH_DEFAULT,
  clampPaneWidth,
  readPaneWidth,
} from "@/presentation/studio/pane-width";

test("desk pane width stays inside the drag range", () => {
  assert.equal(readPaneWidth(null, INSPECTOR_WIDTH_DEFAULT), INSPECTOR_WIDTH_DEFAULT);
  assert.equal(readPaneWidth("", SCENE_CHAT_WIDTH_DEFAULT), SCENE_CHAT_WIDTH_DEFAULT);
  assert.equal(readPaneWidth("nope", SCENE_CHAT_WIDTH_DEFAULT), SCENE_CHAT_WIDTH_DEFAULT);
  assert.equal(readPaneWidth("420", INSPECTOR_WIDTH_DEFAULT), 420);
  assert.equal(clampPaneWidth(80), PANE_WIDTH_MIN);
  assert.equal(clampPaneWidth(2000), PANE_WIDTH_MAX);
});

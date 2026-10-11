import assert from "node:assert/strict";
import { test } from "node:test";
import { previewSrcWhileBusy } from "@/presentation/components/project/scene-still-preview-src";

test("a live still wins over the held picture", () => {
  assert.equal(previewSrcWhileBusy("new", "old", true), "new");
});

test("a busy redraw keeps the last still", () => {
  assert.equal(previewSrcWhileBusy(undefined, "old", true), "old");
});

test("an idle empty tile does not keep a stale still", () => {
  assert.equal(previewSrcWhileBusy(undefined, "old", false), undefined);
});

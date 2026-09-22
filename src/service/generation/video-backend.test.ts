import assert from "node:assert/strict";
import { test } from "node:test";
import { clipVideoProvider, shouldSubmitClipVideoToAlicloud } from "@/service/generation/video-backend";

test("clip video stays on Higgsfield even when AliCloud is configured", () => {
  assert.equal(clipVideoProvider(true), "higgsfield");
  assert.equal(clipVideoProvider(false), "higgsfield");
  assert.equal(shouldSubmitClipVideoToAlicloud(true), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { clipVideoProvider, shouldSubmitClipVideoToAlicloud } from "@/service/generation/video-backend";

test("clip video uses OpenRouter even when AliCloud is configured", () => {
  assert.equal(clipVideoProvider(true), "openrouter");
  assert.equal(clipVideoProvider(false), "openrouter");
  assert.equal(shouldSubmitClipVideoToAlicloud(true), false);
});

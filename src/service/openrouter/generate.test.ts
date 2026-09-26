import assert from "node:assert/strict";
import { test } from "node:test";
import { openRouterImageFromBody } from "@/service/openrouter/generate";

test("openRouterImageFromBody reads the first base64 image", () => {
  const parsed = openRouterImageFromBody({
    data: [{ b64_json: "abc", media_type: "image/png" }],
  });
  assert.equal(parsed.image?.b64_json, "abc");
  assert.equal(parsed.image?.media_type, "image/png");
});

test("openRouterImageFromBody surfaces the provider error", () => {
  const parsed = openRouterImageFromBody({
    error: { message: "content policy violation" },
  });
  assert.equal(parsed.image, undefined);
  assert.equal(parsed.error, "content policy violation");
  assert.equal(parsed.nsfw, true);
});

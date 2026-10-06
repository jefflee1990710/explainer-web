import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRefundPreview } from "@/service/post/preview-policy";

test("a failed preview refunds and a completed one does not", () => {
  assert.equal(shouldRefundPreview("failed"), true);
  assert.equal(shouldRefundPreview("nsfw"), true);
  assert.equal(shouldRefundPreview("completed"), false);
  assert.equal(shouldRefundPreview("in_progress"), false);
});

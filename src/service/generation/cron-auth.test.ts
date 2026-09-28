import assert from "node:assert/strict";
import { test } from "node:test";
import { isCronAuthorized } from "@/service/generation/cron-auth";

function req(auth?: string) {
  return new Request("https://x.test/api/cron/submit-jobs", {
    headers: auth ? { authorization: auth } : {},
  });
}

test("accepts the exact bearer secret", () => {
  assert.equal(isCronAuthorized(req("Bearer s3cret"), "s3cret"), true);
});

test("rejects missing, wrong, or unset secrets", () => {
  assert.equal(isCronAuthorized(req(), "s3cret"), false);
  assert.equal(isCronAuthorized(req("Bearer nope"), "s3cret"), false);
  assert.equal(isCronAuthorized(req("Bearer "), ""), false);
  assert.equal(isCronAuthorized(req("Bearer x"), undefined), false);
});

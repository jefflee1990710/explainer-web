import assert from "node:assert/strict";
import { test } from "node:test";
import { toSent } from "@/service/generation/sent";

test("toSent maps provider keys and keeps media for immediate persist", () => {
  const sent = toSent("m", {
    request_id: "r1",
    status_url: "https://s",
    status: "completed",
    images: [{ url: "https://img" }],
  });
  assert.deepEqual(sent, {
    requestId: "r1",
    statusUrl: "https://s",
    status: "completed",
    model: "m",
    images: [{ url: "https://img" }],
    video: undefined,
    error: undefined,
  });
});

test("toSent picks the provider's error, then message", () => {
  const withError = { request_id: "r", status: "failed", error: "bad", message: "x" };
  assert.equal(toSent("m", withError).error, "bad");
  const withMessage = { request_id: "r", status: "nsfw", message: "blocked" };
  assert.equal(toSent("m", withMessage).error, "blocked");
  const nonString = { request_id: "r", error: { code: 1 } };
  assert.equal(toSent("m", nonString).error, undefined);
});

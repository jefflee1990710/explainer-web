import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForPublicUrl } from "@/service/higgsfield/persist";

test("waitForPublicUrl retries until the blob GET succeeds", async () => {
  const calls: string[] = [];
  const fetchFn = async (url: string) => {
    calls.push(String(url));
    return { ok: calls.length >= 2 } as Response;
  };
  assert.equal(
    await waitForPublicUrl("https://blob.example/end", {
      tries: 3,
      delayMs: 0,
      fetch: fetchFn as typeof fetch,
    }),
    true,
  );
  assert.equal(calls.length, 2);
});

test("waitForPublicUrl gives up after the last try", async () => {
  const fetchFn = async () => ({ ok: false }) as Response;
  assert.equal(
    await waitForPublicUrl("https://blob.example/end", {
      tries: 2,
      delayMs: 0,
      fetch: fetchFn as typeof fetch,
    }),
    false,
  );
});

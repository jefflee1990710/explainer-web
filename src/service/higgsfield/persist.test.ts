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

test("waitForPublicUrl uses HEAD first and falls back to GET on 405", async () => {
  const methods: string[] = [];
  const fetchFn = async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    methods.push(method);
    if (method === "HEAD") {
      return { ok: false, status: 405 } as Response;
    }
    return { ok: true, status: 200 } as Response;
  };
  assert.equal(
    await waitForPublicUrl("https://blob.example/end", {
      tries: 1,
      delayMs: 0,
      fetch: fetchFn as typeof fetch,
    }),
    true,
  );
  assert.deepEqual(methods, ["HEAD", "GET"]);
});

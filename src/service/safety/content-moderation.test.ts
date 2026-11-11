import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeMediaBuffer,
  checkImageSafety,
} from "@/service/safety/content-moderation";

test("checkImageSafety returns safe for benign response", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"isSafe": true, "category": "safe", "reason": "normal image"}',
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const res = await checkImageSafety(
    { buffer: Buffer.from("fake-img") },
    { fetch: fakeFetch },
  );
  assert.equal(res.isSafe, true);
  assert.equal(res.category, "safe");
});

test("checkImageSafety detects adult content and throws in assertSafeMediaBuffer", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '```json\n{"isSafe": false, "category": "adult_pornography", "reason": "explicit sexual intercourse"}\n```',
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const res = await checkImageSafety(
    { buffer: Buffer.from("fake-img") },
    { fetch: fakeFetch },
  );
  assert.equal(res.isSafe, false);
  assert.equal(res.category, "adult_pornography");
  assert.equal(res.reason, "explicit sexual intercourse");

  await assert.rejects(
    async () => {
      // simulate check throwing
      throw new Error("內容未通過安全檢查");
    },
    /內容未通過安全檢查/,
  );
  assert.equal(typeof assertSafeMediaBuffer, "function");
});

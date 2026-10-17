import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  openRouterVideoCallbackUrl,
  openRouterVideoWebhookUpdate,
  signOpenRouterWebhook,
  verifyOpenRouterWebhookSignature,
} from "@/service/openrouter/webhook";

const SECRET = "dev_secret";
const NOW = 1_700_000_000_000;

test("openRouterVideoCallbackUrl requires a public HTTPS app URL and a signing secret", () => {
  assert.equal(
    openRouterVideoCallbackUrl("https://explainer.io", SECRET),
    "https://explainer.io/api/webhooks/openrouter",
  );
  assert.equal(openRouterVideoCallbackUrl("https://explainer.io/", SECRET), "https://explainer.io/api/webhooks/openrouter");
  assert.equal(openRouterVideoCallbackUrl("http://localhost:3000", SECRET), undefined);
  assert.equal(openRouterVideoCallbackUrl("http://203.0.113.10", SECRET), undefined);
  assert.equal(openRouterVideoCallbackUrl("https://explainer.io", ""), undefined);
});

test("verifyOpenRouterWebhookSignature accepts a fresh HMAC and rejects tampering", () => {
  const raw = JSON.stringify({ type: "video.generation.completed", data: { id: "job-1", status: "completed" } });
  const header = signOpenRouterWebhook(raw, SECRET, NOW);
  assert.equal(verifyOpenRouterWebhookSignature(raw, header, SECRET, NOW), true);
  assert.equal(verifyOpenRouterWebhookSignature(`${raw} `, header, SECRET, NOW), false);
  assert.equal(verifyOpenRouterWebhookSignature(raw, header, "other", NOW), false);
  assert.equal(verifyOpenRouterWebhookSignature(raw, null, SECRET, NOW), false);
  assert.equal(
    verifyOpenRouterWebhookSignature(raw, header, SECRET, NOW + 301_000),
    false,
  );
});

test("signOpenRouterWebhook matches the documented t=,v1= payload", () => {
  const raw = "{\"ok\":true}";
  const timestamp = Math.floor(NOW / 1000).toString();
  const expected = createHmac("sha256", SECRET).update(`${timestamp},${raw}`).digest("hex");
  assert.equal(signOpenRouterWebhook(raw, SECRET, NOW), `t=${timestamp},v1=${expected}`);
});

test("openRouterVideoWebhookUpdate reads terminal video events", () => {
  assert.deepEqual(
    openRouterVideoWebhookUpdate({
      type: "video.generation.completed",
      data: {
        id: "job-1",
        status: "completed",
        unsigned_urls: ["https://openrouter.ai/api/v1/videos/job-1/content?index=0"],
      },
    }),
    {
      requestId: "job-1",
      status: "completed",
      outputUrl: "https://openrouter.ai/api/v1/videos/job-1/content?index=0",
      error: undefined,
    },
  );

  assert.deepEqual(
    openRouterVideoWebhookUpdate({
      type: "video.generation.expired",
      data: { id: "job-2", status: "expired", error: "Job expired" },
    }),
    { requestId: "job-2", status: "failed", outputUrl: undefined, error: "Job expired" },
  );

  assert.equal(
    openRouterVideoWebhookUpdate({
      type: "video.generation.failed",
      data: { id: "job-3", status: "failed", error: "Content policy violation" },
    })?.status,
    "nsfw",
  );

  assert.equal(
    openRouterVideoWebhookUpdate({
      type: "video.generation.completed",
      data: { id: "job-4", status: "pending" },
    }),
    undefined,
  );
});

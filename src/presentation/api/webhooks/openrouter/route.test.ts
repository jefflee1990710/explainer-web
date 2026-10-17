import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "@/presentation/api/webhooks/openrouter/route";
import { signOpenRouterWebhook } from "@/service/openrouter/webhook";

const SECRET = "dev_secret";

function signedRequest(body: string, secret = SECRET, nowMs = Date.now()) {
  return new Request("https://explainer.io/api/webhooks/openrouter", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-openrouter-signature": signOpenRouterWebhook(body, secret, nowMs),
    },
    body,
  });
}

test("OpenRouter webhook rejects a missing or bad signature", async () => {
  const previous = process.env.OPENROUTER_WEBHOOK_SECRET;
  process.env.OPENROUTER_WEBHOOK_SECRET = SECRET;
  try {
    const missing = await POST(
      new Request("https://explainer.io/api/webhooks/openrouter", {
        method: "POST",
        body: "{}",
      }),
    );
    assert.equal(missing.status, 401);

    const bad = await POST(signedRequest("{}", "other-secret"));
    assert.equal(bad.status, 401);
  } finally {
    if (previous === undefined) delete process.env.OPENROUTER_WEBHOOK_SECRET;
    else process.env.OPENROUTER_WEBHOOK_SECRET = previous;
  }
});

test("OpenRouter webhook rejects a signed event that is not a terminal video job", async () => {
  const previous = process.env.OPENROUTER_WEBHOOK_SECRET;
  process.env.OPENROUTER_WEBHOOK_SECRET = SECRET;
  const raw = JSON.stringify({
    type: "video.generation.completed",
    data: { id: "job-1", status: "pending" },
  });
  try {
    const response = await POST(signedRequest(raw));
    assert.equal(response.status, 400);
  } finally {
    if (previous === undefined) delete process.env.OPENROUTER_WEBHOOK_SECRET;
    else process.env.OPENROUTER_WEBHOOK_SECRET = previous;
  }
});

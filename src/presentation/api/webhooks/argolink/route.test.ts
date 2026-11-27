import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/presentation/api/webhooks/argolink/route";
import { signArgolinkWebhook } from "@/service/argolink/webhook";

const SECRET = "whsec_dGVzdC1zZWNyZXQ";

function signedRequest(body: string, secret = SECRET, nowMs = Date.now()) {
  const signed = signArgolinkWebhook(body, secret, "msg_route", nowMs);
  return new Request("https://www.scro.io/api/webhooks/argolink", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": signed.id,
      "webhook-timestamp": signed.timestamp,
      "webhook-signature": signed.signature,
    },
    body,
  });
}

test("ArgoLink webhook rejects a missing or bad signature", async () => {
  const previous = process.env.ARGOLINK_WEBHOOK_SECRET;
  process.env.ARGOLINK_WEBHOOK_SECRET = SECRET;
  try {
    const missing = await POST(
      new Request("https://www.scro.io/api/webhooks/argolink", { method: "POST", body: "{}" }),
    );
    assert.equal(missing.status, 401);

    const bad = await POST(signedRequest("{}", "whsec_b3RoZXI"));
    assert.equal(bad.status, 401);
  } finally {
    if (previous === undefined) delete process.env.ARGOLINK_WEBHOOK_SECRET;
    else process.env.ARGOLINK_WEBHOOK_SECRET = previous;
  }
});

test("ArgoLink webhook rejects a signed body that is not JSON", async () => {
  const previous = process.env.ARGOLINK_WEBHOOK_SECRET;
  process.env.ARGOLINK_WEBHOOK_SECRET = SECRET;
  try {
    const response = await POST(signedRequest("not-json"));
    assert.equal(response.status, 400);
  } finally {
    if (previous === undefined) delete process.env.ARGOLINK_WEBHOOK_SECRET;
    else process.env.ARGOLINK_WEBHOOK_SECRET = previous;
  }
});

test("a signed pending status is acknowledged without looking up a job", async () => {
  const previous = process.env.ARGOLINK_WEBHOOK_SECRET;
  process.env.ARGOLINK_WEBHOOK_SECRET = SECRET;
  try {
    const response = await POST(signedRequest(JSON.stringify({ request_id: "req-1", status: "pending" })));
    assert.equal(response.status, 200);
  } finally {
    if (previous === undefined) delete process.env.ARGOLINK_WEBHOOK_SECRET;
    else process.env.ARGOLINK_WEBHOOK_SECRET = previous;
  }
});

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { signArgolinkWebhook, verifyArgolinkWebhookSignature } from "@/service/argolink/webhook";

const SECRET = "whsec_dGVzdC1zZWNyZXQ";

test("a Standard Webhooks signature matches the raw body and rejects a replay", () => {
  const raw = JSON.stringify({ request_id: "req-1", status: "done" });
  const now = 1_700_000_000_000;
  const signed = signArgolinkWebhook(raw, SECRET, "msg_1", now);
  const headers = { id: signed.id, timestamp: signed.timestamp, signature: signed.signature };
  assert.equal(verifyArgolinkWebhookSignature(raw, headers, SECRET, now), true);
  assert.equal(verifyArgolinkWebhookSignature(`${raw} `, headers, SECRET, now), false);
  assert.equal(verifyArgolinkWebhookSignature(raw, headers, "whsec_b3RoZXI", now), false);
  assert.equal(verifyArgolinkWebhookSignature(raw, headers, SECRET, now + 6 * 60 * 1000), false);
  assert.equal(
    verifyArgolinkWebhookSignature(raw, { ...headers, signature: "v1,aaaa v1,bbbb" }, SECRET, now),
    false,
  );
});

test("any v1 signature in the header list is accepted", () => {
  const raw = "{}";
  const now = 1_700_000_000_000;
  const signed = signArgolinkWebhook(raw, SECRET, "msg_2", now);
  const secret = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secret).update(`msg_2.${signed.timestamp}.${raw}`).digest("base64");
  assert.equal(signed.signature, `v1,${expected}`);
  assert.equal(
    verifyArgolinkWebhookSignature(
      raw,
      { id: "msg_2", timestamp: signed.timestamp, signature: `v0,nope ${signed.signature}` },
      SECRET,
      now,
    ),
    true,
  );
});

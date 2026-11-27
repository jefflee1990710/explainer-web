import { createHmac, timingSafeEqual } from "node:crypto";

// ArgoLink signs per the Standard Webhooks spec and asks receivers to refuse timestamps more than five minutes off.
const SIGNATURE_MAX_AGE_SECONDS = 300;

export type ArgolinkWebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

// `whsec_<base64>` → raw key bytes. A secret without the prefix is still read as base64.
function secretKey(secret: string): Buffer {
  return Buffer.from(secret.trim().replace(/^whsec_/, ""), "base64");
}

function expectedSignature(secret: string, id: string, timestamp: string, rawBody: string): Buffer {
  return createHmac("sha256", secretKey(secret)).update(`${id}.${timestamp}.${rawBody}`).digest();
}

// `webhook-signature` is a space-separated list of `v1,<base64 HMAC-SHA256>` over `id.timestamp.rawBody`.
export function verifyArgolinkWebhookSignature(
  rawBody: string,
  headers: ArgolinkWebhookHeaders,
  secret: string,
  nowMs = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret.trim() || !id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const age = Math.floor(nowMs / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > SIGNATURE_MAX_AGE_SECONDS) return false;

  const expected = expectedSignature(secret, id, timestamp, rawBody);
  return signature.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    const given = Buffer.from(part.slice(3), "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

// Test helper that signs a body the way ArgoLink does.
export function signArgolinkWebhook(
  rawBody: string,
  secret: string,
  id: string,
  nowMs = Date.now(),
): { id: string; timestamp: string; signature: string } {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const signature = `v1,${expectedSignature(secret, id, timestamp, rawBody).toString("base64")}`;
  return { id, timestamp, signature };
}

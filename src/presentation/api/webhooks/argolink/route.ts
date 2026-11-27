import { NextResponse } from "next/server";
import { applyArgolinkCanvasWebhook } from "@/service/argolink/canvas-webhook";
import { verifyArgolinkWebhookSignature } from "@/service/argolink/webhook";

// ArgoLink POSTs the final video status here. The signature is checked on the raw body.
export async function POST(request: Request) {
  const secret = (process.env.ARGOLINK_WEBHOOK_SECRET || "").trim();
  const rawBody = await request.text();
  const valid = verifyArgolinkWebhookSignature(
    rawBody,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    secret,
  );
  if (!secret || !valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await applyArgolinkCanvasWebhook(body);
  return NextResponse.json(result.body, { status: result.status });
}

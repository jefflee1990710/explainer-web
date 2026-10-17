import { NextResponse } from "next/server";
import { applyJobStatus } from "@/service/higgsfield/pipeline";
import {
  openRouterVideoWebhookUpdate,
  verifyOpenRouterWebhookSignature,
} from "@/service/openrouter/webhook";

// OpenRouter POSTs here when a video job reaches a terminal state.
export async function POST(request: Request) {
  const secret = (process.env.OPENROUTER_WEBHOOK_SECRET || "").trim();
  const rawBody = await request.text();
  const signature = request.headers.get("x-openrouter-signature");
  if (!secret || !verifyOpenRouterWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const update = openRouterVideoWebhookUpdate(body);
  if (!update) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  await applyJobStatus(update);
  return NextResponse.json({ received: true });
}

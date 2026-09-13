import { NextResponse } from "next/server";
import { applyJobStatus } from "@/lib/higgsfield/pipeline";
import { mediaUrlFromResponse } from "@/lib/higgsfield/client";

type HiggsfieldPayload = {
  request_id?: string;
  requestId?: string;
  status?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
};

export async function POST(request: Request) {
  const secret = process.env.HF_WEBHOOK_SECRET;
  const headerSecret =
    request.headers.get("x-higgsfield-secret") ||
    request.headers.get("x-webhook-secret");
  if (secret && headerSecret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as HiggsfieldPayload;
  const requestId = payload.request_id || payload.requestId;
  if (!requestId || !payload.status) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  await applyJobStatus({
    requestId,
    status: payload.status,
    outputUrl: mediaUrlFromResponse({
      images: payload.images,
      video: payload.video,
    }),
  });

  return NextResponse.json({ received: true });
}

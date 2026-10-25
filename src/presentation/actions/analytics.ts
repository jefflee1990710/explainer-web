"use server";

import { headers } from "next/headers";
import type { UxEventCategory } from "@/model/ux-event";
import { persistUxEvent } from "@/service/analytics/ux-tracker";

export type ClientUxEventPayload = {
  event: string;
  category?: UxEventCategory;
  anonId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  locale?: string | null;
  params?: Record<string, unknown>;
};

// Server Action called by client `track()` and SPA route observer to mirror GA4 events into MongoDB.
export async function recordClientUxEventAction(
  payload: ClientUxEventPayload,
): Promise<{ ok: boolean }> {
  try {
    const hdrs = await headers();
    const userAgent = hdrs.get("user-agent");
    await persistUxEvent({
      event: payload.event,
      category: payload.category,
      source: "client",
      anonId: payload.anonId ?? null,
      sessionId: payload.sessionId ?? null,
      path: payload.path ?? null,
      referrer: payload.referrer ?? null,
      locale: payload.locale ?? null,
      params: payload.params,
      userAgent,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

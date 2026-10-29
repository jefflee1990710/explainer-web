"use server";

import { headers } from "next/headers";
import type { UxEventCategory } from "@/model/ux-event";
import { resolveScroAdmin } from "@/service/academy/admin";
import {
  getAdminUserCreations,
  type AdminUserCreationsDetail,
} from "@/service/analytics/user-creations";
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

// Admin-only Server Action to inspect all creations (videos, characters, life photos, failed jobs) of a specific user.
export async function getAdminUserCreationsAction(
  clerkUserId: string,
): Promise<
  | { ok: true; data: AdminUserCreationsDetail }
  | { ok: false; error: string }
> {
  try {
    const auth = await resolveScroAdmin();
    if (!auth.ok) {
      return { ok: false, error: "無權限讀取用戶創作資料" };
    }
    const detail = await getAdminUserCreations(clerkUserId);
    if (!detail) {
      return { ok: false, error: "找不到該用戶的資料" };
    }
    return { ok: true, data: detail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取用戶創作失敗",
    };
  }
}

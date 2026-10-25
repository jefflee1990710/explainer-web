import { uxEventsCollection } from "@/dao";
import {
  inferUxEventCategory,
  sanitizeUxParams,
  type UxEventCategory,
  type UxEventSource,
} from "@/model/ux-event";
import { getAuthSession } from "@/service/auth";

export type LogUxEventInput = {
  event: string;
  category?: UxEventCategory;
  source?: UxEventSource;
  clerkUserId?: string | null;
  userEmail?: string | null;
  anonId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  locale?: string | null;
  params?: Record<string, unknown>;
  userAgent?: string | null;
};

// Persist a UX event into MongoDB `ux_events`. Never throws so user flows stay unaffected.
export async function persistUxEvent(input: LogUxEventInput): Promise<void> {
  try {
    const eventName = input.event?.trim().slice(0, 120);
    if (!eventName) return;

    let clerkUserId = input.clerkUserId ?? null;
    let userEmail = input.userEmail ?? null;

    if (!clerkUserId) {
      const session = await getAuthSession();
      if (session) {
        clerkUserId = session.uid;
        userEmail = userEmail ?? session.email ?? null;
      }
    }

    const col = await uxEventsCollection();
    await col.insertOne({
      event: eventName,
      category: input.category ?? inferUxEventCategory(eventName),
      source: input.source ?? "server",
      clerkUserId,
      userEmail,
      anonId: input.anonId?.slice(0, 80) ?? null,
      sessionId: input.sessionId?.slice(0, 80) ?? null,
      path: input.path?.slice(0, 300) ?? null,
      referrer: input.referrer?.slice(0, 300) ?? null,
      locale: input.locale?.slice(0, 20) ?? null,
      params: sanitizeUxParams(input.params),
      userAgent: input.userAgent?.slice(0, 240) ?? null,
      createdAt: new Date(),
    });
  } catch {
    // Analytics must never interrupt user actions.
  }
}

// Fire-and-forget wrapper for Server Actions.
export function logServerUxEvent(
  event: string,
  params?: Record<string, unknown>,
  options?: {
    category?: UxEventCategory;
    clerkUserId?: string | null;
    userEmail?: string | null;
    path?: string | null;
  },
): void {
  void persistUxEvent({
    event,
    source: "server",
    category: options?.category,
    clerkUserId: options?.clerkUserId,
    userEmail: options?.userEmail,
    path: options?.path,
    params,
  });
}

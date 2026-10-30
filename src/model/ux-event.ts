import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// High-level UX funnel category for grouping events in /scroadmin/analytics.
export const UX_EVENT_CATEGORIES = [
  "navigation",
  "auth",
  "onboarding",
  "character",
  "wardrobe",
  "life",
  "video",
  "editor",
  "billing",
  "blocker",
] as const;

export type UxEventCategory = (typeof UX_EVENT_CATEGORIES)[number];
export type UxEventSource = "client" | "server";

// One user journey or blocker event stored in the `ux_events` MongoDB collection.
export type UxEvent = {
  _id?: ObjectId;
  event: string;
  category: UxEventCategory;
  source: UxEventSource;
  clerkUserId?: string | null;
  userEmail?: string | null;
  anonId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  locale?: string | null;
  params?: Record<string, unknown>;
  userAgent?: string | null;
  createdAt: Date;
};

export const uxEventSchema: z.ZodType<UxEvent> = z.object({
  _id: objectIdSchema.optional(),
  event: z.string().min(1).max(120),
  category: z.enum(UX_EVENT_CATEGORIES),
  source: z.enum(["client", "server"]),
  clerkUserId: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  anonId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.date(),
});

// Infer the funnel category from an event name when the caller does not specify one.
export function inferUxEventCategory(event: string): UxEventCategory {
  const normalized = event.trim().toLowerCase();
  if (
    normalized.startsWith("ux_blocker_") ||
    normalized.includes("insufficient_credits") ||
    normalized.endsWith("_failed") ||
    normalized.endsWith("_error")
  ) {
    return "blocker";
  }
  if (
    normalized === "page_view" ||
    normalized === "session_engagement" ||
    normalized.startsWith("nav_")
  ) {
    return "navigation";
  }
  if (
    normalized === "login" ||
    normalized === "sign_up" ||
    normalized === "sign_out" ||
    normalized.startsWith("auth_")
  ) {
    return "auth";
  }
  if (
    normalized === "legal_accepted" ||
    normalized.startsWith("legal_") ||
    normalized === "folder_created" ||
    normalized.startsWith("onboarding_") ||
    normalized.startsWith("studio_home")
  ) {
    return "onboarding";
  }
  if (normalized.startsWith("character_")) {
    return "character";
  }
  if (normalized.startsWith("wardrobe_")) {
    return "wardrobe";
  }
  if (normalized.startsWith("life_")) {
    return "life";
  }
  if (
    normalized.startsWith("free_preview_") ||
    normalized.startsWith("wizard_") ||
    normalized.startsWith("sample_script_")
  ) {
    return "onboarding";
  }
  if (
    normalized.startsWith("opencut_") ||
    normalized.startsWith("editor_") ||
    normalized.startsWith("subtitle_")
  ) {
    return "editor";
  }
  if (
    normalized.startsWith("billing_") ||
    normalized.startsWith("add_credits_") ||
    normalized === "begin_checkout" ||
    normalized === "purchase" ||
    normalized === "view_pricing"
  ) {
    return "billing";
  }
  return "video";
}

// Strip oversized strings or data URLs before persisting event metadata to MongoDB.
export function sanitizeUxParams(
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params || typeof params !== "object") return undefined;
  const out: Record<string, unknown> = {};
  const entries = Object.entries(params).slice(0, 25);
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      if (value.startsWith("data:")) {
        out[key] = "[redacted_data_url]";
      } else if (value.length > 300) {
        out[key] = `${value.slice(0, 300)}...`;
      } else {
        out[key] = value;
      }
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 10).map((item) =>
        typeof item === "string" && item.length > 100
          ? `${item.slice(0, 100)}...`
          : item,
      );
    } else {
      try {
        const serialized = JSON.stringify(value);
        out[key] =
          serialized.length > 300
            ? `${serialized.slice(0, 300)}...`
            : JSON.parse(serialized);
      } catch {
        out[key] = String(value).slice(0, 120);
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

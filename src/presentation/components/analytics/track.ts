import { recordClientUxEventAction } from "@/presentation/actions/analytics";

type Gtag = (...args: unknown[]) => void;

const ANON_STORAGE_KEY = "scro_anon_id";
const SESSION_STORAGE_KEY = "scro_session_id";

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Persistent anonymous visitor ID in localStorage so pre-signup and post-signup journeys link together.
export function getOrCreateAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(ANON_STORAGE_KEY);
    if (!id) {
      id = randomId("anon");
      window.localStorage.setItem(ANON_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Browser-tab session ID in sessionStorage to group a single visit's funnel steps.
export function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = randomId("sess");
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Detect social in-app WebViews (Instagram, Facebook, Threads, WeChat, Line, TikTok) where OAuth popups often fail.
export function detectInAppBrowser(userAgent?: string | null): string | null {
  const ua = (
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  ).toLowerCase();
  if (!ua) return null;
  if (ua.includes("instagram")) return "instagram";
  if (ua.includes("Barcelona".toLowerCase()) || ua.includes("threads")) return "threads";
  if (ua.includes("fban") || ua.includes("fbav") || ua.includes("fb_iab")) return "facebook";
  if (ua.includes("micromessenger")) return "wechat";
  if (ua.includes("line/")) return "line";
  if (ua.includes("musical_ly") || ua.includes("tiktok") || ua.includes("bytedancewebview")) {
    return "tiktok";
  }
  if (ua.includes("whatsapp")) return "whatsapp";
  if (ua.includes("linkedinapp")) return "linkedin";
  return null;
}

function sendClientEvent(event: string, params?: Record<string, unknown>): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as Window & { gtag?: Gtag; dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = (...args: unknown[]) => {
      w.dataLayer?.push(args);
    };
  }
  w.gtag("event", event, params);

  const path = `${window.location.pathname}${window.location.search || ""}`;
  const referrer = document.referrer || null;
  const locale = document.documentElement.lang || null;
  const anonId = getOrCreateAnonId();
  const sessionId = getOrCreateSessionId();

  return recordClientUxEventAction({
    event,
    anonId,
    sessionId,
    path,
    referrer,
    locale,
    params,
  }).catch(() => {});
}

// Queue a GA4 event and mirror it to MongoDB `ux_events` via Server Action.
export function track(event: string, params?: Record<string, unknown>) {
  void sendClientEvent(event, params);
}

// Awaitable tracker for actions right before a hard `window.location.assign` navigation, capped at 1200ms.
export async function trackAsync(
  event: string,
  params?: Record<string, unknown>,
): Promise<void> {
  if (typeof window === "undefined") return;
  await Promise.race([
    sendClientEvent(event, params),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
  ]);
}

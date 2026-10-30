"use server";

import { cookies, headers } from "next/headers";
import { persistUxEvent } from "@/service/analytics/ux-tracker";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";
import { scheduleOperatorAccountEmail } from "@/service/notify/operator-email";
import { accountEventKind } from "@/service/notify/operator-notice";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export type EstablishSessionTelemetry = {
  event?: "login" | "sign_up";
  method?: "email" | "google";
  mode?: "sign-in" | "sign-up";
  nextPath?: string;
  anonId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  locale?: string | null;
};

// Trade a Firebase ID token for an httpOnly session cookie the server can verify.
export async function establishSessionAction(
  idToken: string,
  telemetry?: EstablishSessionTelemetry,
) {
  const expiresIn = TWO_WEEKS_MS;
  const auth = adminAuth();
  const session = await auth.createSessionCookie(idToken, { expiresIn });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn / 1000,
  });

  // Tell the operator about this sign-in and record a server-side UX event so hard page navigation never drops it.
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const record = await auth.getUser(decoded.uid);
    const email = record.email || decoded.email || "";
    const kind = accountEventKind(Date.parse(record.metadata.creationTime), Date.now());
    const hdrs = await headers();
    const userAgent = hdrs.get("user-agent");

    if (telemetry?.event) {
      await persistUxEvent({
        event: telemetry.event,
        category: "auth",
        source: "server",
        clerkUserId: decoded.uid,
        userEmail: email || null,
        anonId: telemetry.anonId ?? null,
        sessionId: telemetry.sessionId ?? null,
        path: telemetry.path ?? null,
        referrer: telemetry.referrer ?? null,
        locale: telemetry.locale ?? null,
        userAgent,
        params: {
          method: telemetry.method ?? (record.providerData[0]?.providerId === "google.com" ? "google" : "email"),
          mode: telemetry.mode ?? (telemetry.event === "sign_up" ? "sign-up" : "sign-in"),
          nextPath: telemetry.nextPath ?? "/app",
          accountKind: kind,
        },
      });
    }

    if (!email) return;
    scheduleOperatorAccountEmail({
      kind,
      name: record.displayName || email.split("@")[0] || "User",
      email,
      provider: record.providerData[0]?.providerId || "password",
      at: new Date(),
    });
  } catch (error) {
    console.error("[notify] operator account lookup failed", error);
  }
}

export async function clearSessionAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

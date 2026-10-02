"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";
import { scheduleOperatorAccountEmail } from "@/service/notify/operator-email";
import { accountEventKind } from "@/service/notify/operator-notice";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Trade a Firebase ID token for an httpOnly session cookie the server can verify.
export async function establishSessionAction(idToken: string) {
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

  // Tell the operator about this sign-in. A brand-new Firebase user is a registration.
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const record = await auth.getUser(decoded.uid);
    const email = record.email || decoded.email || "";
    if (!email) return;
    scheduleOperatorAccountEmail({
      kind: accountEventKind(Date.parse(record.metadata.creationTime), Date.now()),
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

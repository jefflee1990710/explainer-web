"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Trade a Firebase ID token for an httpOnly session cookie the server can verify.
export async function establishSessionAction(idToken: string) {
  const expiresIn = TWO_WEEKS_MS;
  const session = await adminAuth().createSessionCookie(idToken, { expiresIn });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn / 1000,
  });
}

export async function clearSessionAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usersCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import {
  LEGAL_CONSENT_COOKIE,
  consentCookieValue,
  currentLegalAcceptance,
} from "@/service/legal/versions";

// Remember that this browser checked both boxes, so the new account stores those versions.
export async function setSignupConsent(input: { terms: boolean; privacy: boolean }) {
  const jar = await cookies();
  if (input.terms && input.privacy) {
    jar.set(LEGAL_CONSENT_COOKIE, consentCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return;
  }
  jar.delete(LEGAL_CONSENT_COOKIE);
}

// Logged-in user accepts the versions currently published.
export async function acceptCurrentPolicies(input: { terms: boolean; privacy: boolean }) {
  if (!input.terms || !input.privacy) {
    return { ok: false as const, error: "請先同意服務條款與私隱政策" };
  }
  const user = await requireAppUser();
  const users = await usersCollection();
  const now = new Date();
  await users.updateOne(
    { _id: user._id },
    { $set: { legalAcceptance: currentLegalAcceptance(now), updatedAt: now } },
  );
  redirect("/app");
}

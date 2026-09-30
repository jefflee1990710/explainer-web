"use server";

import { usersCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { currentLegalAcceptance } from "@/service/legal/versions";

// Logged-in user accepts the versions currently published.
// The dialog reloads /app itself; a redirect to the same URL leaves the popup mounted.
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
  return { ok: true as const };
}

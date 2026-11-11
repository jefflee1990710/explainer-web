"use server";

import { revalidatePath } from "next/cache";
import { usersCollection } from "@/dao";
import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import { requireAppUser } from "@/service/auth";
import {
  buildMarketingConsentUpdate,
  currentLegalAcceptance,
} from "@/service/legal/versions";

// Logged-in user accepts the versions currently published (plus optional marketing email opt-in).
// The dialog reloads /app itself; a redirect to the same URL leaves the popup mounted.
export async function acceptCurrentPolicies(input: {
  terms: boolean;
  privacy: boolean;
  marketingOptIn?: boolean;
}) {
  if (!input.terms || !input.privacy) {
    logServerUxEvent("ux_blocker_legal_incomplete", {
      terms: input.terms,
      privacy: input.privacy,
    });
    return { ok: false as const, error: "請先同意服務條款與私隱政策" };
  }
  const user = await requireAppUser();
  const users = await usersCollection();
  const now = new Date();
  const marketingOptIn = Boolean(input.marketingOptIn);
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        legalAcceptance: currentLegalAcceptance(now),
        ...buildMarketingConsentUpdate(marketingOptIn, now),
        updatedAt: now,
      },
    },
  );
  logServerUxEvent(
    "legal_accepted",
    { marketingOptIn },
    {
      clerkUserId: user.clerkUserId,
      userEmail: user.email,
    },
  );
  return { ok: true as const };
}

// Allow a signed-in user to update their marketing email preference from Settings.
export async function updateMarketingConsentAction(consented: boolean) {
  const user = await requireAppUser();
  const users = await usersCollection();
  const now = new Date();
  const allowed = Boolean(consented);
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        ...buildMarketingConsentUpdate(allowed, now),
        updatedAt: now,
      },
    },
  );
  logServerUxEvent(
    "marketing_consent_updated",
    { marketingOptIn: allowed },
    {
      clerkUserId: user.clerkUserId,
      userEmail: user.email,
    },
  );
  revalidatePath("/app/settings");
  return { ok: true as const, marketingEmailsAllowed: allowed };
}

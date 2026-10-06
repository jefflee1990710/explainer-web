import type { PlanId } from "@/model/subscription";

// How many characters one account may keep. A user without a subscription keeps one.
export const CHARACTER_LIMIT: Record<PlanId, number> = {
  starter: 5,
  pro: 15,
  studio: 40,
  scale: 100,
};

// This address is not subject to the character cap.
const CHARACTER_LIMIT_UNLOCK_EMAIL = "jeff.lee.1990710@gmail.com";

export function characterLimit(planId: PlanId | null | undefined) {
  if (!planId) return 1;
  return CHARACTER_LIMIT[planId];
}

export function isCharacterLimitUnlocked(email: string | null | undefined) {
  return (email || "").trim().toLowerCase() === CHARACTER_LIMIT_UNLOCK_EMAIL;
}

// null means this account has no character cap.
export function characterAllowance(
  planId: PlanId | null | undefined,
  email: string | null | undefined,
) {
  if (isCharacterLimitUnlocked(email)) return null;
  return characterLimit(planId);
}

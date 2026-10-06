import type { PlanId } from "@/model/subscription";

// How many styles one character may have, including the style it was created with.
// A user without a subscription keeps that one style.
export const CHARACTER_STYLE_LIMIT: Record<PlanId, number> = {
  starter: 2,
  pro: 3,
  studio: 5,
  scale: 8,
};

// Same address as the character-count cap: no per-character style limit.
const CHARACTER_STYLE_UNLOCK_EMAIL = "jeff.lee.1990710@gmail.com";

export function characterStyleLimit(planId: PlanId | null | undefined) {
  if (!planId) return 1;
  return CHARACTER_STYLE_LIMIT[planId];
}

export function isCharacterStyleLimitUnlocked(email: string | null | undefined) {
  return (email || "").trim().toLowerCase() === CHARACTER_STYLE_UNLOCK_EMAIL;
}

// null means this account can add styles without a plan cap.
export function characterStyleAllowance(
  planId: PlanId | null | undefined,
  email: string | null | undefined,
) {
  if (isCharacterStyleLimitUnlocked(email)) return null;
  return characterStyleLimit(planId);
}

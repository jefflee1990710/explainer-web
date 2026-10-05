import type { PlanId } from "@/model/subscription";

// How many styles one character may have, including the style it was created with.
// A user without a subscription keeps that one style.
export const CHARACTER_STYLE_LIMIT: Record<PlanId, number> = {
  starter: 2,
  pro: 3,
  studio: 5,
  scale: 8,
};

export function characterStyleLimit(planId: PlanId | null | undefined) {
  if (!planId) return 1;
  return CHARACTER_STYLE_LIMIT[planId];
}

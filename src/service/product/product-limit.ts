import type { PlanId } from "@/model/subscription";
import { isCharacterLimitUnlocked } from "@/service/character/character-limit";

// Same caps as characters. The unlocked account has no product cap either.
export const PRODUCT_LIMIT: Record<PlanId, number> = {
  starter: 5,
  pro: 15,
  studio: 40,
  scale: 100,
};

export function productLimit(planId: PlanId | null | undefined) {
  if (!planId) return 1;
  return PRODUCT_LIMIT[planId];
}

// null means this account has no product cap.
export function productAllowance(planId: PlanId | null | undefined, email: string | null | undefined) {
  if (isCharacterLimitUnlocked(email)) return null;
  return productLimit(planId);
}

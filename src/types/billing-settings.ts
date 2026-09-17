import type { PlanId } from "@/types/subscription";

export type PackId = "pack30" | "pack90" | "pack200";

export type CreditPackPrice = {
  priceId: string;
  productId: string;
  amountUsd: number;
};

// Singleton billing config persisted after Stripe products are created.
export type BillingSettings = {
  _id: "billing";
  starterPriceId: string;
  proPriceId: string;
  studioPriceId: string;
  scalePriceId: string;
  starterProductId: string;
  proProductId: string;
  studioProductId: string;
  scaleProductId: string;
  // Amount last written to Stripe, so we rotate prices when list prices change.
  amountsUsd: Record<PlanId, number>;
  // Previous price ids still map to a plan for existing subscribers.
  legacyPriceIds: Partial<Record<PlanId, string[]>>;
  creditPacks: Record<PackId, CreditPackPrice>;
  updatedAt: Date;
};

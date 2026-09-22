import { z } from "zod";
import type { PlanId } from "@/model/subscription";

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

const creditPackPriceSchema = z.object({
  priceId: z.string(),
  productId: z.string(),
  amountUsd: z.number(),
});

export const billingSettingsSchema: z.ZodType<BillingSettings> = z.object({
  _id: z.literal("billing"),
  starterPriceId: z.string(),
  proPriceId: z.string(),
  studioPriceId: z.string(),
  scalePriceId: z.string(),
  starterProductId: z.string(),
  proProductId: z.string(),
  studioProductId: z.string(),
  scaleProductId: z.string(),
  amountsUsd: z.object({
    starter: z.number(),
    pro: z.number(),
    studio: z.number(),
    scale: z.number(),
  }),
  legacyPriceIds: z.object({
    starter: z.array(z.string()).optional(),
    pro: z.array(z.string()).optional(),
    studio: z.array(z.string()).optional(),
    scale: z.array(z.string()).optional(),
  }),
  creditPacks: z.object({
    pack30: creditPackPriceSchema,
    pack90: creditPackPriceSchema,
    pack200: creditPackPriceSchema,
  }),
  updatedAt: z.date(),
});

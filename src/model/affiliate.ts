import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type AffiliateTier = 1 | 2 | 3;

export type AffiliateProfile = {
  _id: ObjectId;
  clerkUserId: string;
  userId: ObjectId;
  code: string;
  // Wallet balances in USD cents.
  pendingCents: number;
  paidCents: number;
  lifetimeEarnedCents: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AffiliateLedgerKind = "buy" | "consume" | "consume_reverse" | "payout";

export type AffiliateLedgerEntry = {
  _id: ObjectId;
  // Earner (upline affiliate).
  affiliateClerkUserId: string;
  // User whose purchase/spend generated the commission.
  sourceClerkUserId: string;
  tier: AffiliateTier;
  kind: AffiliateLedgerKind;
  // Positive for earn; negative for reverse / payout.
  amountCents: number;
  rate: number;
  // Buy: Stripe amount; consume: creditUsd * cashCentsPerUsd (or legacy credits * usdPerCredit).
  baseAmountCents: number;
  // Canonical USD credit amount for this ledger event.
  creditUsd?: number;
  // Cash cents paid per $1.00 of USD credit in the consumed lot.
  cashCentsPerUsd?: number;
  // Legacy integer credit fields kept optional for historical ledger entries.
  credits?: number;
  usdPerCreditCents?: number;
  // Idempotency / reverse link.
  eventKey: string;
  reversesEventKey?: string;
  createdAt: Date;
};

export type CreditLotSource = "subscription" | "pack" | "bonus" | "manual";

// FIFO batch of purchased USD credit with a fixed real-cash cents per USD credit rate.
export type CreditLot = {
  _id: ObjectId;
  clerkUserId: string;
  source: CreditLotSource;
  sourceId: string;
  // Canonical USD credit fields for FIFO lot accounting.
  creditUsdRemaining?: number;
  creditUsdOriginal?: number;
  // Real cash cents paid per $1.00 of granted USD credit (e.g., 85 for 15%-off promo).
  cashCentsPerUsd?: number;
  // Legacy integer credit fields kept optional for unmigrated lots.
  creditsRemaining?: number;
  creditsOriginal?: number;
  // Price paid per legacy credit in USD cents (integer).
  usdPerCreditCents?: number;
  amountPaidCents: number;
  createdAt: Date;
};

export type PayoutRequestStatus = "pending" | "paid" | "rejected";

export type PayoutRequest = {
  _id: ObjectId;
  clerkUserId: string;
  amountCents: number;
  status: PayoutRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
};

export const affiliateProfileSchema: z.ZodType<AffiliateProfile> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  userId: objectIdSchema,
  code: z.string(),
  pendingCents: z.number(),
  paidCents: z.number(),
  lifetimeEarnedCents: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const affiliateLedgerEntrySchema: z.ZodType<AffiliateLedgerEntry> = z.object({
  _id: objectIdSchema,
  affiliateClerkUserId: z.string(),
  sourceClerkUserId: z.string(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: z.enum(["buy", "consume", "consume_reverse", "payout"]),
  amountCents: z.number(),
  rate: z.number(),
  baseAmountCents: z.number(),
  creditUsd: z.number().optional(),
  cashCentsPerUsd: z.number().optional(),
  credits: z.number().optional(),
  usdPerCreditCents: z.number().optional(),
  eventKey: z.string(),
  reversesEventKey: z.string().optional(),
  createdAt: z.date(),
});

export const creditLotSchema: z.ZodType<CreditLot> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  source: z.enum(["subscription", "pack", "bonus", "manual"]),
  sourceId: z.string(),
  creditUsdRemaining: z.number().optional(),
  creditUsdOriginal: z.number().optional(),
  cashCentsPerUsd: z.number().optional(),
  creditsRemaining: z.number().optional(),
  creditsOriginal: z.number().optional(),
  usdPerCreditCents: z.number().optional(),
  amountPaidCents: z.number(),
  createdAt: z.date(),
});

export const payoutRequestSchema: z.ZodType<PayoutRequest> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  amountCents: z.number(),
  status: z.enum(["pending", "paid", "rejected"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  paidAt: z.date().optional(),
});

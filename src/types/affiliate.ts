import type { ObjectId } from "mongodb";

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
  // Buy: Stripe amount; consume: credits * usdPerCredit.
  baseAmountCents: number;
  credits?: number;
  usdPerCreditCents?: number;
  // Idempotency / reverse link.
  eventKey: string;
  reversesEventKey?: string;
  createdAt: Date;
};

export type CreditLotSource = "subscription" | "pack" | "bonus" | "manual";

// FIFO batch of purchased credits with a fixed USD/credit price.
export type CreditLot = {
  _id: ObjectId;
  clerkUserId: string;
  source: CreditLotSource;
  sourceId: string;
  creditsRemaining: number;
  creditsOriginal: number;
  // Price paid per credit in USD cents (integer).
  usdPerCreditCents: number;
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

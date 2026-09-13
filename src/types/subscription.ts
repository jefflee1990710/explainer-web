import type { ObjectId } from "mongodb";

export type PlanId = "starter" | "pro";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

// Stripe subscription snapshot used for credit gates.
export type Subscription = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  monthlyCredits: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
};

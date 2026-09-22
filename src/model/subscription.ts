import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type PlanId = "starter" | "pro" | "studio" | "scale";

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

export const planIdSchema = z.enum(["starter", "pro", "studio", "scale"]);
export const subscriptionStatusSchema = z.enum([
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const subscriptionSchema: z.ZodType<Subscription> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  stripePriceId: z.string(),
  planId: planIdSchema,
  status: subscriptionStatusSchema,
  monthlyCredits: z.number(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

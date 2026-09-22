import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// App user mirrored from Clerk into MongoDB.
export type AppUser = {
  _id: ObjectId;
  clerkUserId: string;
  email: string;
  name: string;
  stripeCustomerId?: string;
  credits: number;
  // Unspent one-time packs that survive monthly refill.
  bonusCredits?: number;
  // Current period bar denominator (monthly allotment + packs).
  creditLimit?: number;
  processedCheckoutIds?: string[];
  // Affiliate: direct referrer and upline chain [L1, L2, L3].
  referredByUserId?: ObjectId;
  uplineUserIds?: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export const appUserSchema: z.ZodType<AppUser> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  email: z.string(),
  name: z.string(),
  stripeCustomerId: z.string().optional(),
  credits: z.number(),
  bonusCredits: z.number().optional(),
  creditLimit: z.number().optional(),
  processedCheckoutIds: z.array(z.string()).optional(),
  referredByUserId: objectIdSchema.optional(),
  uplineUserIds: z.array(objectIdSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

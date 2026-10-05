import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// App user mirrored from Firebase Auth into MongoDB.
// clerkUserId holds the Firebase uid so older documents and queries stay valid.
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
  // Operator switch. Only true accounts see and use Affiliate.
  affiliateEnabled?: boolean;
  // Affiliate: direct referrer and upline chain [L1, L2, L3].
  referredByUserId?: ObjectId;
  uplineUserIds?: ObjectId[];
  // Versions of Terms and Privacy the user last accepted. Missing or stale blocks the app.
  legalAcceptance?: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: Date;
  };
  // Times this user ran “fill voice from blueprint”, used for the 5-minute cap.
  voiceFillAt?: Date[];
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
  affiliateEnabled: z.boolean().optional(),
  referredByUserId: objectIdSchema.optional(),
  uplineUserIds: z.array(objectIdSchema).optional(),
  legalAcceptance: z
    .object({
      termsVersion: z.string(),
      privacyVersion: z.string(),
      acceptedAt: z.date(),
    })
    .optional(),
  voiceFillAt: z.array(z.date()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

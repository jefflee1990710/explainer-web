import type { ObjectId } from "mongodb";

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
  createdAt: Date;
  updatedAt: Date;
};

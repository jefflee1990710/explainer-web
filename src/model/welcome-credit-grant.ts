import type { ObjectId } from "mongodb";

// Records each one-time welcome credit grant to stop multi-account credit farming
// across Gmail aliases, same mobile deviceId, or same IP address.
export type WelcomeCreditGrant = {
  _id: ObjectId;
  clerkUserId: string;
  normalizedEmail: string;
  deviceId?: string;
  ipHash?: string;
  grantedAt: Date;
};

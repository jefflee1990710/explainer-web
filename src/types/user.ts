import type { ObjectId } from "mongodb";

// App user mirrored from Clerk into MongoDB.
export type AppUser = {
  _id: ObjectId;
  clerkUserId: string;
  email: string;
  name: string;
  stripeCustomerId?: string;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
};

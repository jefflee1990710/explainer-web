import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type BlockedUser = {
  _id: ObjectId;
  email: string;
  clerkUserId?: string;
  reason: string;
  blockedAt: Date;
  blockedBy: string;
  ip?: string;
  notes?: string;
};

export const blockedUserSchema: z.ZodType<BlockedUser> = z.object({
  _id: objectIdSchema,
  email: z.string().email(),
  clerkUserId: z.string().optional(),
  reason: z.string(),
  blockedAt: z.date(),
  blockedBy: z.string(),
  ip: z.string().optional(),
  notes: z.string().optional(),
});

import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type McpApiKey = {
  _id: ObjectId;
  clerkUserId: string;
  userId: ObjectId;
  // SHA-256 hex of the full secret; plaintext never stored.
  keyHash: string;
  // First 12 chars after prefix for UI display (exp_live_xxxx…).
  keyPrefix: string;
  name: string;
  revokedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
};

export type McpToolCall = {
  _id: ObjectId;
  clerkUserId: string;
  apiKeyId: ObjectId;
  tool: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  chargedUsd?: number;
  // Legacy integer credit field preserved for pre-migration records.
  creditsCharged?: number;
  createdAt: Date;
};

export const mcpApiKeySchema: z.ZodType<McpApiKey> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  userId: objectIdSchema,
  keyHash: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  revokedAt: z.date().optional(),
  lastUsedAt: z.date().optional(),
  createdAt: z.date(),
});

export const mcpToolCallSchema: z.ZodType<McpToolCall> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  apiKeyId: objectIdSchema,
  tool: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
  latencyMs: z.number(),
  chargedUsd: z.number().optional(),
  creditsCharged: z.number().optional(),
  createdAt: z.date(),
});

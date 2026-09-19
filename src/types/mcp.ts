import type { ObjectId } from "mongodb";

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
  creditsCharged: number;
  createdAt: Date;
};

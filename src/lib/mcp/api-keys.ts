import { createHash, randomBytes } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import type { OptionalId } from "mongodb";
import { mcpApiKeysCollection, usersCollection } from "@/lib/collections";
import type { AppUser } from "@/types/user";
import type { McpApiKey } from "@/types/mcp";

// When set, requireAppUser() returns this user (MCP API-key auth path).
export const mcpUserStore = new AsyncLocalStorage<AppUser>();

const KEY_PREFIX = "exp_live_";

export function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKeySecret() {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export async function createMcpApiKey(user: AppUser, name: string) {
  const secret = generateApiKeySecret();
  const keyHash = hashApiKey(secret);
  const keys = await mcpApiKeysCollection();
  await keys.createIndex({ keyHash: 1 }, { unique: true }).catch(() => {});
  await keys.createIndex({ clerkUserId: 1 }).catch(() => {});

  const doc: OptionalId<McpApiKey> = {
    clerkUserId: user.clerkUserId,
    userId: user._id,
    keyHash,
    keyPrefix: secret.slice(0, 16),
    name: name.trim().slice(0, 40) || "Default",
    createdAt: new Date(),
  };
  const insert = await keys.insertOne(doc);
  return {
    id: insert.insertedId.toHexString(),
    secret,
    keyPrefix: doc.keyPrefix,
    name: doc.name,
  };
}

export async function revokeMcpApiKey(clerkUserId: string, keyId: string) {
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(keyId)) return false;
  const keys = await mcpApiKeysCollection();
  const result = await keys.updateOne(
    { _id: new ObjectId(keyId), clerkUserId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount === 1;
}

export async function listMcpApiKeys(clerkUserId: string) {
  const keys = await mcpApiKeysCollection();
  return keys
    .find({ clerkUserId, revokedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();
}

export type ApiKeyAuth = {
  user: AppUser;
  apiKey: McpApiKey;
};

export async function authenticateApiKey(
  authorization: string | null,
): Promise<ApiKeyAuth | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const secret = authorization.slice("Bearer ".length).trim();
  if (!secret.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashApiKey(secret);
  const keys = await mcpApiKeysCollection();
  const apiKey = await keys.findOne({ keyHash, revokedAt: { $exists: false } });
  if (!apiKey) return null;

  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId: apiKey.clerkUserId });
  if (!user) return null;

  // Touch lastUsedAt asynchronously-ish (fire and forget is fine).
  void keys.updateOne(
    { _id: apiKey._id },
    { $set: { lastUsedAt: new Date() } },
  );

  return { user, apiKey };
}

export async function runAsMcpUser<T>(user: AppUser, fn: () => Promise<T>) {
  return mcpUserStore.run(user, fn);
}

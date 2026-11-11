import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { BlockedUser } from "@/model/blocked-user";

export async function blockedUsersCollection(): Promise<Collection<OptionalId<BlockedUser>>> {
  const db = await getDb();
  const col = db.collection<OptionalId<BlockedUser>>("blocked_users");
  return col;
}

export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Checks whether an email or clerkUserId is in the blocked_users collection.
 */
export async function isEmailOrUidBlocked(
  email?: string | null,
  clerkUserId?: string | null,
): Promise<{ blocked: boolean; reason?: string }> {
  const normalized = normalizeEmail(email);
  const trimmedUid = (clerkUserId || "").trim();
  if (!normalized && !trimmedUid) return { blocked: false };

  const col = await blockedUsersCollection();
  const query: Record<string, unknown>[] = [];
  if (normalized) {
    query.push({ email: normalized });
  }
  if (trimmedUid) {
    query.push({ clerkUserId: trimmedUid });
  }

  const match = await col.findOne({ $or: query });
  if (match) {
    return {
      blocked: true,
      reason: match.reason || "該帳號因違反服務條款已被停權",
    };
  }
  return { blocked: false };
}

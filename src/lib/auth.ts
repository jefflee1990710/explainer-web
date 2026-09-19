import { cookies } from "next/headers";
import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import {
  bindReferralOnSignup,
  ensureAffiliateProfile,
} from "@/lib/affiliate/engine";
import { REFERRAL_COOKIE } from "@/lib/affiliate/rates";
import { usersCollection } from "@/lib/collections";
import { mcpUserStore } from "@/lib/mcp/api-keys";
import type { AppUser } from "@/types/user";

// Upsert the Mongo user from the current Clerk session.
// React cache() dedupes layout + page calls within one navigation request.
const requireAppUserImpl = cache(async (): Promise<AppUser> => {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("請先登入");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email ||
    "User";

  const users = await usersCollection();
  const existing = await users.findOne({ clerkUserId: clerkUser.id });
  const now = new Date();

  if (existing) {
    // Skip a write on every navigation when Clerk profile is unchanged.
    if (existing.email === email && existing.name === name) {
      await ensureAffiliateProfile(existing);
      return existing;
    }
    await users.updateOne(
      { clerkUserId: clerkUser.id },
      { $set: { email, name, updatedAt: now } },
    );
    const updated = { ...existing, email, name, updatedAt: now };
    await ensureAffiliateProfile(updated);
    return updated;
  }

  // First-touch referral cookie from /r/[code].
  let referralCode: string | undefined;
  try {
    const jar = await cookies();
    referralCode = jar.get(REFERRAL_COOKIE)?.value;
  } catch {
    referralCode = undefined;
  }

  await users.updateOne(
    { clerkUserId: clerkUser.id },
    {
      $set: { email, name, updatedAt: now },
      $setOnInsert: {
        clerkUserId: clerkUser.id,
        credits: 0,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  let user = await users.findOne({ clerkUserId: clerkUser.id });
  if (!user) {
    throw new Error("無法建立使用者");
  }

  user = await bindReferralOnSignup(user, referralCode);
  await ensureAffiliateProfile(user);
  return user;
});

export async function requireAppUser(): Promise<AppUser> {
  // MCP API-key requests bind the user here so existing actions work unchanged.
  const mcpUser = mcpUserStore.getStore();
  if (mcpUser) return mcpUser;
  return requireAppUserImpl();
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  bindReferralOnSignup,
  ensureAffiliateProfile,
} from "@/service/affiliate/engine";
import { AFFILIATE_ENABLED, isAffiliateAccount } from "@/service/affiliate/enabled";
import { REFERRAL_COOKIE } from "@/service/affiliate/rates";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import { usersCollection } from "@/dao";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";
import { mcpUserStore } from "@/service/mcp/api-keys";
import type { AppUser } from "@/model/user";

// Firebase session cookie, or null when the visitor is signed out.
export const getAuthSession = cache(async () => {
  try {
    const session = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!session) return null;
    return await adminAuth().verifySessionCookie(session, true);
  } catch {
    return null;
  }
});

// Upsert the Mongo user from the Firebase session.
// clerkUserId stores the Firebase uid so existing queries keep working.
// React cache() dedupes layout + page calls within one navigation request.
const requireAppUserImpl = cache(async (): Promise<AppUser> => {
  const session = await getAuthSession();
  // Missing or expired session. redirect() is control flow, so build prerender does not 500.
  if (!session) redirect("/sign-in?next=/app");

  const email = session.email || "";
  const name = session.name || email.split("@")[0] || "User";
  const uid = session.uid;

  const users = await usersCollection();
  const existing = await users.findOne({ clerkUserId: uid });
  const now = new Date();

  if (existing) {
    // Skip a write on every navigation when the profile is unchanged.
    if (existing.email === email && existing.name === name) {
      if (isAffiliateAccount(existing)) await ensureAffiliateProfile(existing);
      return existing;
    }
    await users.updateOne(
      { clerkUserId: uid },
      { $set: { email, name, updatedAt: now } },
    );
    const updated = { ...existing, email, name, updatedAt: now };
    if (isAffiliateAccount(updated)) await ensureAffiliateProfile(updated);
    return updated;
  }

  // First-touch referral cookie from /r/[code]. Ignored while affiliate is off.
  let referralCode: string | undefined;
  if (AFFILIATE_ENABLED) {
    try {
      const jar = await cookies();
      referralCode = jar.get(REFERRAL_COOKIE)?.value;
    } catch {
      referralCode = undefined;
    }
  }

  // Terms and privacy are accepted in the first-login dialog, not at account creation.
  await users.updateOne(
    { clerkUserId: uid },
    {
      $set: { email, name, updatedAt: now },
      $setOnInsert: {
        clerkUserId: uid,
        credits: WELCOME_CREDITS,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  let user = await users.findOne({ clerkUserId: uid });
  if (!user) {
    throw new Error("無法建立使用者");
  }

  if (AFFILIATE_ENABLED) {
    user = await bindReferralOnSignup(user, referralCode);
    if (isAffiliateAccount(user)) await ensureAffiliateProfile(user);
  }
  return user;
});

export async function requireAppUser(): Promise<AppUser> {
  // MCP API-key requests bind the user here so existing actions work unchanged.
  const mcpUser = mcpUserStore.getStore();
  if (mcpUser) return mcpUser;
  return requireAppUserImpl();
}

// Task list / meters only need the auth id — skip affiliate upsert.
export async function requireClerkUserId(): Promise<string> {
  const mcpUser = mcpUserStore.getStore();
  if (mcpUser) return mcpUser.clerkUserId;
  const session = await getAuthSession();
  if (!session) redirect("/sign-in?next=/app");
  return session.uid;
}

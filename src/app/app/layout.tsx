import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usersCollection } from "@/dao";
import { AppShell } from "@/presentation/components/app-shell";
import { AcceptPoliciesDialog } from "@/presentation/components/legal/accept-policies-dialog";
import { isAffiliateAccount } from "@/service/affiliate/enabled";
import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import { getAuthSession, requireAppUser } from "@/service/auth";
import { countActiveTasks } from "@/service/generation/task-list";
import { adhocBonusPercent } from "@/service/billing/promo";
import {
  currentLegalAcceptance,
  needsPolicyAcceptance,
  shouldAutoRecordInitialPolicyAcceptance,
} from "@/service/legal/versions";

// Session cookie is only available per request, so do not prerender /app at build time.
export const dynamic = "force-dynamic";

// Private studio routes should never be indexed by search engines.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// Header meter count; a DB hiccup must not take down the whole app shell.
async function safeCountActiveTasks(clerkUserId: string) {
  try {
    return await countActiveTasks(clerkUserId);
  } catch (error) {
    console.error("countActiveTasks failed", error);
    return 0;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/sign-in?next=/app");
  const user = await requireAppUser();
  if (shouldAutoRecordInitialPolicyAcceptance(user)) {
    const now = new Date();
    const acceptance = currentLegalAcceptance(now);
    user.legalAcceptance = acceptance;
    try {
      const users = await usersCollection();
      await users.updateOne(
        { _id: user._id },
        { $set: { legalAcceptance: acceptance, updatedAt: now } },
      );
      logServerUxEvent("legal_accepted", undefined, {
        clerkUserId: user.clerkUserId,
        userEmail: user.email,
      });
    } catch (error) {
      console.error("auto legalAcceptance failed", error);
    }
  }
  const activeTasks = await safeCountActiveTasks(user.clerkUserId);
  return (
    <>
      <AppShell
        credits={user.credits}
        creditLimit={user.creditLimit || 0}
        activeTasks={activeTasks}
        email={user.email}
        name={user.name}
        avatarUrl={session.picture}
        affiliateEnabled={isAffiliateAccount(user)}
        signupDiscountPercent={user.signupDiscountPercent}
        promoBonusPercent={adhocBonusPercent()}
      >
        {children}
      </AppShell>
      {/* Stale policy versions still require explicit re-consent via AcceptPoliciesDialog */}
      {Boolean(user.legalAcceptance) && needsPolicyAcceptance(user) ? (
        <AcceptPoliciesDialog firstTime={false} />
      ) : null}
    </>
  );
}

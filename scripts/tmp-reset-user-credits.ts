/**
 * Operator: monthly credit refill for one account by email.
 * Usage: npx tsx scripts/tmp-reset-user-credits.ts <email>
 */
import { loadEnvConfig } from "@next/env";
import { usersCollection, subscriptionsCollection } from "@/dao";
import { resetMonthlyCredits, getActiveSubscription } from "@/service/billing/credits";
import { PLANS } from "@/service/billing/plans";

loadEnvConfig(process.cwd());

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("usage: npx tsx scripts/tmp-reset-user-credits.ts <email>");

  const users = await usersCollection();
  const user = await users.findOne({ email });
  if (!user) throw new Error(`找不到使用者：${email}`);

  const active = await getActiveSubscription(user.clerkUserId);
  const subs = await subscriptionsCollection();
  const latest = await subs.findOne({ clerkUserId: user.clerkUserId }, { sort: { updatedAt: -1 } });
  const sub = active ?? latest;
  // Use live plan definition so stale subscription.monthlyCredits does not under-refill.
  const monthly = sub?.planId ? PLANS[sub.planId].monthlyCredits : PLANS.studio.monthlyCredits;

  const before = {
    credits: user.credits,
    bonusCredits: user.bonusCredits ?? 0,
    creditLimit: user.creditLimit ?? 0,
  };

  await resetMonthlyCredits(user.clerkUserId, monthly);

  const afterUser = await users.findOne({ _id: user._id });
  console.log(
    JSON.stringify(
      {
        email: user.email,
        clerkUserId: user.clerkUserId,
        planId: sub?.planId ?? null,
        subscriptionStatus: sub?.status ?? null,
        monthlyCredits: monthly,
        before,
        after: {
          credits: afterUser?.credits,
          bonusCredits: afterUser?.bonusCredits ?? 0,
          creditLimit: afterUser?.creditLimit ?? 0,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

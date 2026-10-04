import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const email = "jeff.lee.1990710@gmail.com";
  const { usersCollection, subscriptionsCollection } = await import("@/dao");
  const { PLANS } = await import("@/service/billing/plans");
  const { resetMonthlyCredits } = await import("@/service/billing/credits");
  const users = await usersCollection();
  const user = await users.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  if (!user) {
    console.log(JSON.stringify({ found: false }));
    return;
  }
  const subs = await subscriptionsCollection();
  const sub = await subs.findOne({ clerkUserId: user.clerkUserId }, { sort: { updatedAt: -1 } });
  console.log(
    "before " +
      JSON.stringify({
        credits: user.credits,
        bonusCredits: user.bonusCredits || 0,
        creditLimit: user.creditLimit || 0,
        planId: sub?.planId ?? null,
        status: sub?.status ?? null,
        monthlyCredits: sub?.monthlyCredits ?? null,
      }),
  );
  const planCredits = sub?.planId ? PLANS[sub.planId].monthlyCredits : 0;
  if (!planCredits) {
    console.log(JSON.stringify({ updated: false, reason: "no subscription allotment" }));
    return;
  }
  await resetMonthlyCredits(user.clerkUserId, planCredits);
  const after = await users.findOne({ clerkUserId: user.clerkUserId });
  console.log(
    "after " +
      JSON.stringify({
        credits: after?.credits,
        bonusCredits: after?.bonusCredits || 0,
        creditLimit: after?.creditLimit || 0,
      }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

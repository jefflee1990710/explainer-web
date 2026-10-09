import { loadEnvConfig } from "@next/env";
import { usersCollection } from "@/dao/users";
import { resetMonthlyCredits, getActiveSubscription } from "@/service/billing/credits";
import { isPlanId, PLANS } from "@/service/billing/plans";

loadEnvConfig(process.cwd());

async function main() {
  const email = "jeff.lee.1990710@gmail.com";
  const users = await usersCollection();
  const user = await users.findOne({ email });
  if (!user) {
    console.error("user not found");
    process.exit(1);
  }

  const sub = await getActiveSubscription(user.clerkUserId);
  if (!sub || !isPlanId(sub.planId)) {
    console.error("no active plan", sub?.status ?? null, sub?.planId ?? null);
    process.exit(1);
  }

  const allotment = PLANS[sub.planId].monthlyCredits;
  console.log(
    JSON.stringify({
      before: {
        credits: user.credits,
        bonusCredits: user.bonusCredits ?? 0,
        creditLimit: user.creditLimit,
      },
      planId: sub.planId,
      status: sub.status,
      storedMonthlyCredits: sub.monthlyCredits,
      allotment,
    }),
  );

  await resetMonthlyCredits(user.clerkUserId, allotment);

  const after = await users.findOne({ _id: user._id });
  console.log(
    JSON.stringify({
      after: {
        credits: after?.credits,
        bonusCredits: after?.bonusCredits ?? 0,
        creditLimit: after?.creditLimit,
      },
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

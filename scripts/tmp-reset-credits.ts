import { loadEnvConfig } from "@next/env";
import { usersCollection } from "@/dao/users";
import { resetMonthlyCreditUsd, getActiveSubscription } from "@/service/billing/credits";
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

  const allotmentUsd = PLANS[sub.planId].monthlyCreditUsd;
  console.log(
    JSON.stringify({
      before: {
        creditUsd: user.creditUsd,
        bonusCreditUsd: user.bonusCreditUsd ?? 0,
        creditLimitUsd: user.creditLimitUsd,
      },
      planId: sub.planId,
      status: sub.status,
      storedMonthlyCreditUsd: sub.monthlyCreditUsd,
      allotmentUsd,
    }),
  );

  await resetMonthlyCreditUsd(user.clerkUserId, allotmentUsd);

  const after = await users.findOne({ _id: user._id });
  console.log(
    JSON.stringify({
      after: {
        creditUsd: after?.creditUsd,
        bonusCreditUsd: after?.bonusCreditUsd ?? 0,
        creditLimitUsd: after?.creditLimitUsd,
      },
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

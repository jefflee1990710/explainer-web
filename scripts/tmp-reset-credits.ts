import { loadEnvConfig } from "@next/env";
import { usersCollection } from "@/dao";
import { PLANS } from "@/service/billing/plans";
import { resetMonthlyCredits } from "@/service/billing/credits";

loadEnvConfig(process.cwd());

async function main() {
  const email = "jeff.lee.1990710@gmail.com";
  const users = await usersCollection();
  const user = await users.findOne({ email });
  if (!user) {
    console.log("USER_NOT_FOUND");
    return;
  }
  // Live Pro allowance. The subscription row still stores an older 120.
  await resetMonthlyCredits(user.clerkUserId, PLANS.pro.monthlyCredits);
  const next = await users.findOne({ clerkUserId: user.clerkUserId });
  console.log(
    JSON.stringify(
      {
        email,
        before: {
          credits: user.credits,
          bonusCredits: user.bonusCredits ?? 0,
          creditLimit: user.creditLimit ?? null,
        },
        after: {
          credits: next?.credits,
          bonusCredits: next?.bonusCredits ?? 0,
          creditLimit: next?.creditLimit ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main().then(() => process.exit(0));

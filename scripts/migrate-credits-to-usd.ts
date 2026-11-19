import { loadEnvConfig } from "@next/env";
import {
  creditLotsCollection,
  subscriptionsCollection,
  usersCollection,
} from "@/dao";
import { resolveLotCashCentsPerUsd } from "@/service/affiliate/lots";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { isPlanId, PLANS } from "@/service/billing/plans";
import { legacyCreditsToUsd } from "@/service/billing/usd";

loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");

// Idempotently migrates legacy integer credit documents in users, subscriptions, and creditLots to USD Credit.
async function main() {
  const [users, subscriptions, creditLots] = await Promise.all([
    usersCollection(),
    subscriptionsCollection(),
    creditLotsCollection(),
  ]);

  const now = new Date();
  let migratedUsers = 0;
  let migratedSubscriptions = 0;
  let migratedCreditLots = 0;

  // 1. Migrate users where canonical creditUsd does not exist yet (matching legacy credits to prevent stale overwrites).
  const legacyUsers = await users.find({ creditUsd: { $exists: false } }).toArray();
  for (const user of legacyUsers) {
    const balance = resolveUserUsdBalance(user);
    if (!dryRun) {
      const res = await users.updateOne(
        {
          _id: user._id,
          creditUsd: { $exists: false },
          ...(typeof user.credits === "number"
            ? { credits: user.credits }
            : { credits: { $exists: false } }),
        },
        {
          $set: {
            creditUsd: balance.creditUsd,
            bonusCreditUsd: balance.bonusCreditUsd,
            creditLimitUsd: balance.creditLimitUsd,
            creditMigratedAt: now,
            updatedAt: now,
          },
        },
      );
      if (res.modifiedCount === 1) migratedUsers += 1;
    } else {
      migratedUsers += 1;
    }
  }

  // 2. Backfill subscriptions where monthlyCreditUsd does not exist yet.
  const legacySubs = await subscriptions
    .find({ monthlyCreditUsd: { $exists: false } })
    .toArray();
  for (const sub of legacySubs) {
    const monthlyCreditUsd = isPlanId(sub.planId)
      ? PLANS[sub.planId].monthlyCreditUsd
      : legacyCreditsToUsd(sub.monthlyCredits ?? 0);
    if (!dryRun) {
      const res = await subscriptions.updateOne(
        { _id: sub._id, monthlyCreditUsd: { $exists: false } },
        {
          $set: {
            monthlyCreditUsd,
            updatedAt: now,
          },
        },
      );
      if (res.modifiedCount === 1) migratedSubscriptions += 1;
    } else {
      migratedSubscriptions += 1;
    }
  }

  // 3. Backfill affiliate FIFO credit lots (collection: creditLots) where creditUsdRemaining does not exist yet.
  const legacyLots = await creditLots
    .find({ creditUsdRemaining: { $exists: false } })
    .toArray();
  for (const lot of legacyLots) {
    const creditUsdRemaining = legacyCreditsToUsd(lot.creditsRemaining ?? 0);
    const creditUsdOriginal = legacyCreditsToUsd(
      lot.creditsOriginal ?? lot.creditsRemaining ?? 0,
    );
    const rate = resolveLotCashCentsPerUsd(lot);
    if (!dryRun) {
      const res = await creditLots.updateOne(
        { _id: lot._id, creditUsdRemaining: { $exists: false } },
        {
          $set: {
            creditUsdRemaining,
            creditUsdOriginal,
            cashCentsPerUsd: rate,
          },
        },
      );
      if (res.modifiedCount === 1) migratedCreditLots += 1;
    } else {
      migratedCreditLots += 1;
    }
  }

  const summary = {
    users: migratedUsers,
    subscriptions: migratedSubscriptions,
    creditLots: migratedCreditLots,
  };
  console.log(dryRun ? { dryRun: true, ...summary } : summary);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

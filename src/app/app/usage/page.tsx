import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import {
  getActiveSubscription,
  isSubscriptionActive,
  resolveSubscriptionMonthlyUsd,
} from "@/service/billing/credits";
import { isPackId, CREDIT_PACKS } from "@/service/billing/packs";
import { isPlanId, PLANS } from "@/service/billing/plans";
import { UsageView } from "@/presentation/components/app/billing/usage-view";

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; pack?: string; session_id?: string }>;
}) {
  const user = await requireAppUser();
  const balance = resolveUserUsdBalance(user);
  const params = await searchParams;
  const plan = isPlanId(params.plan) ? PLANS[params.plan] : undefined;
  const pack = isPackId(params.pack) ? CREDIT_PACKS[params.pack] : undefined;
  const purchase =
    params.checkout === "success" && params.session_id && (plan || pack)
      ? {
          sessionId: params.session_id,
          value: plan?.amountUsd ?? pack?.amountUsd ?? 0,
          itemId: plan?.id ?? pack?.id ?? "",
          itemName: plan?.name ?? pack?.nameZh ?? "",
        }
      : undefined;
  const sub = await getActiveSubscription(user.clerkUserId);
  const active = isSubscriptionActive(sub);
  const monthlyCreditUsd = active && sub ? resolveSubscriptionMonthlyUsd(sub) : 0;
  const plans = Object.values(PLANS);

  return (
    <UsageView
      checkoutSuccess={params.checkout === "success"}
      creditUsd={balance.creditUsd}
      creditLimitUsd={balance.creditLimitUsd}
      monthlyCreditUsd={monthlyCreditUsd}
      bonusCreditUsd={balance.bonusCreditUsd}
      periodEnd={sub?.currentPeriodEnd}
      subscribed={active}
      activePlanId={active && sub ? sub.planId : undefined}
      subscriptionStatus={active && sub ? sub.status : undefined}
      plans={plans}
      purchase={purchase}
    />
  );
}

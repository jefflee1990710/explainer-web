import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { PLANS } from "@/service/billing/plans";
import { BillingView } from "@/presentation/components/app/billing/billing-view";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const sub = await getActiveSubscription(user.clerkUserId);
  const active = isSubscriptionActive(sub);

  const plans = Object.values(PLANS);

  return (
    <BillingView
      checkoutSuccess={params.checkout === "success"}
      credits={user.credits}
      creditLimit={user.creditLimit || 0}
      monthlyCredits={sub?.monthlyCredits || 0}
      bonusCredits={user.bonusCredits || 0}
      periodEnd={sub?.currentPeriodEnd}
      subscribed={active}
      activePlanId={active && sub ? sub.planId : undefined}
      subscriptionStatus={active && sub ? sub.status : undefined}
      plans={plans}
    />
  );
}

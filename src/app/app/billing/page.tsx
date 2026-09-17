import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { PLANS } from "@/lib/billing/plans";
import { EnterpriseCta } from "@/components/pricing/enterprise-cta";
import { PortalButton } from "./billing-actions";
import { BillingPlanCard } from "./billing-plan-card";
import { CreditProgress } from "./credit-progress";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const sub = await getActiveSubscription(user.clerkUserId);
  const active = isSubscriptionActive(sub);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">訂閱與 credits</h1>
      {params.checkout === "success" ? (
        <p className="mt-4 rounded-[1rem] border border-accent-ink/10 bg-lime/50 px-4 py-3 text-sm font-medium">
          付款完成。若 credits 尚未更新，稍等 webhook 同步。
        </p>
      ) : null}

      <CreditProgress
        credits={user.credits}
        creditLimit={user.creditLimit || 0}
        monthlyCredits={sub?.monthlyCredits || 0}
        bonusCredits={user.bonusCredits || 0}
        periodEnd={sub?.currentPeriodEnd}
        subscribed={active}
      />

      {active && sub ? (
        <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
          <p className="font-display text-lg font-bold">
            目前方案：{PLANS[sub.planId].nameZh}（{sub.status}）
          </p>
          <p className="mt-2 text-sm text-muted">
            每月 {sub.monthlyCredits} credits，週期至{" "}
            {sub.currentPeriodEnd.toLocaleDateString("zh-Hant")}
          </p>
          <div className="mt-4">
            <PortalButton />
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(PLANS).map((plan) => (
          <BillingPlanCard key={plan.id} plan={plan} />
        ))}
        <EnterpriseCta compact />
      </div>
    </div>
  );
}

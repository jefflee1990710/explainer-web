import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { PLANS } from "@/lib/billing/plans";
import { CheckoutButton, PortalButton } from "./billing-actions";

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
      <p className="mt-2 text-sm text-muted">
        剩餘 {user.credits} credits。1 credit = 1 段 clip。
      </p>
      {params.checkout === "success" ? (
        <p className="mt-4 rounded-[1rem] border border-accent-ink/10 bg-lime/50 px-4 py-3 text-sm font-medium">
          付款完成。若 credits 尚未更新，稍等 webhook 同步。
        </p>
      ) : null}

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

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Object.values(PLANS).map((plan) => (
          <article
            key={plan.id}
            className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
          >
            <h2 className="font-display text-xl font-bold">{plan.nameZh}</h2>
            <p className="mt-2 font-display text-3xl font-bold">${plan.amountUsd}</p>
            <p className="mt-2 text-sm text-muted">{plan.blurb}</p>
            <div className="mt-5">
              <CheckoutButton planId={plan.id} label={`訂閱 ${plan.nameZh}`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

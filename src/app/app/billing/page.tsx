import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listCustomerPaymentCards } from "@/service/billing/customer-billing";
import { BillingView } from "@/presentation/components/app/billing/billing-view";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const [sub, cards] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    listCustomerPaymentCards(user.stripeCustomerId),
  ]);
  const active = isSubscriptionActive(sub);

  return (
    <BillingView
      checkoutSuccess={params.checkout === "success"}
      email={user.email}
      subscribed={active}
      activePlanId={active && sub ? sub.planId : undefined}
      subscriptionStatus={active && sub ? sub.status : undefined}
      periodEnd={sub?.currentPeriodEnd}
      hasStripeCustomer={Boolean(user.stripeCustomerId)}
      cards={cards}
    />
  );
}

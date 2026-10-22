import { notFound } from "next/navigation";
import { apiJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listSelectableStyles } from "@/service/style/list";

export const GET = withApiUser(async ({ auth }) => {
  const [{ system, mine }, sub] = await Promise.all([
    listSelectableStyles(auth.user.clerkUserId),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  return apiJson({ system, mine, subscribed: isSubscriptionActive(sub) });
});

export const POST = withApiUser(async () => {
  notFound();
});

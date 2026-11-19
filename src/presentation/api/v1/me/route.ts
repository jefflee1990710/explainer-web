import { apiJson, withApiUser } from "@/service/api/respond";
import { isAffiliateAccount } from "@/service/affiliate/enabled";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { countActiveTasks } from "@/service/generation/task-list";
import { needsPolicyAcceptance } from "@/service/legal/versions";
import { publicSubscription } from "@/presentation/serialize";

// Signed-in account summary: what the app shell needs (rail footer + banner).
export const GET = withApiUser(async ({ auth }) => {
  const { user } = auth;
  const balance = resolveUserUsdBalance(user);
  const [sub, activeTasks] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    countActiveTasks(user.clerkUserId).catch(() => 0),
  ]);
  return apiJson({
    user: {
      id: user._id.toHexString(),
      email: user.email,
      name: user.name,
      avatarUrl: auth.picture,
      creditUsd: balance.creditUsd,
      creditLimitUsd: balance.creditLimitUsd,
      bonusCreditUsd: balance.bonusCreditUsd,
      affiliateEnabled: isAffiliateAccount(user),
      needsPolicyAcceptance: needsPolicyAcceptance(user),
    },
    subscription: publicSubscription(sub),
    subscribed: isSubscriptionActive(sub),
    activeTasks,
  });
});

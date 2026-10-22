import { notFound } from "next/navigation";
import { apiJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { toPublicSkills } from "@/presentation/serialize";

export const GET = withApiUser(async ({ auth }) => {
  const [skills, sub] = await Promise.all([
    listSelectableSkills(auth.user.clerkUserId),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  const published = toPublicSkills(skills);
  return apiJson({
    system: published,
    mine: [],
    subscribed: isSubscriptionActive(sub),
  });
});

export const POST = withApiUser(async () => {
  notFound();
});

import { notFound } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadStyleForUser } from "@/app/app/styles/load-style-for-user";
import { StyleWorkspace } from "@/presentation/components/app/styles/[id]/style-workspace";

export default async function StylePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const style = await loadStyleForUser(user.clerkUserId, id);
  if (!style) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);

  return <StyleWorkspace style={style} subscribed={isSubscriptionActive(sub)} />;
}

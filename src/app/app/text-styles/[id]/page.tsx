import { notFound } from "next/navigation";
import { getAuthSession, requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadTextStyleForUser } from "@/service/text-style/load";
import { TextStyleWorkspace } from "@/presentation/components/app/text-styles/[id]/text-style-workspace";

export default async function TextStylePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const session = await getAuthSession();
  const style = await loadTextStyleForUser(user.clerkUserId, id);
  if (!style) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);

  return (
    <TextStyleWorkspace
      style={style}
      subscribed={isSubscriptionActive(sub)}
      user={{ name: user.name, email: user.email, avatarUrl: session?.picture }}
    />
  );
}

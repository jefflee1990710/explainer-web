import { LifeDesk } from "@/presentation/components/app/life/life-desk";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listLifePage } from "@/service/character/life";

export default async function LifePage({
  searchParams,
}: {
  searchParams: Promise<{ character?: string }>;
}) {
  const user = await requireAppUser();
  const query = await searchParams;
  const [sub, page] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    listLifePage(user.clerkUserId),
  ]);

  return (
    <div>
      <LifeDesk
        characters={page.characters}
        shots={page.shots}
        initialCharacterId={query.character}
        subscribed={isSubscriptionActive(sub)}
      />
    </div>
  );
}

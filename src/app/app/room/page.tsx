import { charactersCollection } from "@/dao";
import type { Character } from "@/model/character";
import { RoomDesk } from "@/presentation/components/app/room/room-desk";
import { toPublicCharacter } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import {
  getActiveSubscription,
  isSubscriptionActive,
} from "@/service/billing/credits";
import { listSelectableStyles } from "@/service/style/list";

export default async function RoomPage({
  searchParams,
}: {
  searchParams: Promise<{ character?: string }>;
}) {
  const user = await requireAppUser();
  const query = await searchParams;
  const characters = await charactersCollection();
  const [sub, docs, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    listSelectableStyles(user.clerkUserId),
  ]);
  const styles = [...selectableStyles.system, ...selectableStyles.mine];
  const subscribed = isSubscriptionActive(sub);

  return (
    <div>
      <RoomDesk
        characters={docs.map(toPublicCharacter)}
        initialCharacterId={query.character}
        credits={user.credits}
        subscribed={subscribed}
        styles={styles}
      />
    </div>
  );
}

import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { charactersCollection } from "@/dao";
import { toPublicCharacter } from "@/presentation/serialize";
import { listPublicStyles } from "@/service/style/list";
import type { Character } from "@/model/character";
import { CharacterGrid } from "@/presentation/components/app/characters/character-grid";
import { CharactersHeader } from "@/presentation/components/app/characters/characters-header";

export default async function CharactersPage() {
  const user = await requireAppUser();
  const characters = await charactersCollection();
  const [sub, docs, styles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .limit(120)
      .toArray() as Promise<Character[]>,
    listPublicStyles(),
  ]);
  const subscribed = isSubscriptionActive(sub);

  return (
    <div>
      <CharactersHeader credits={user.credits} subscribed={subscribed} styles={styles} />
      <div className="mt-8">
        <CharacterGrid
          characters={docs.map(toPublicCharacter)}
          credits={user.credits}
          subscribed={subscribed}
          styles={styles}
        />
      </div>
    </div>
  );
}

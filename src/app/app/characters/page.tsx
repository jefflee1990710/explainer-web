import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { toPublicCharacter } from "@/lib/serialize";
import { listPublicStyles } from "@/lib/styles/list";
import type { Character } from "@/types/character";
import { CharacterGrid } from "./character-grid";
import { CharactersHeader } from "./characters-header";

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

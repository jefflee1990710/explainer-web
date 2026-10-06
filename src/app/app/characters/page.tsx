import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { characterAllowance } from "@/service/character/character-limit";
import { charactersCollection } from "@/dao";
import { toPublicCharacter } from "@/presentation/serialize";
import { listSelectableStyles } from "@/service/style/list";
import type { Character } from "@/model/character";
import { CharacterGrid } from "@/presentation/components/app/characters/character-grid";
import { CharactersHeader } from "@/presentation/components/app/characters/characters-header";

export default async function CharactersPage() {
  const user = await requireAppUser();
  const characters = await charactersCollection();
  const [sub, docs, characterCount, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    characters.countDocuments({ clerkUserId: user.clerkUserId }),
    listSelectableStyles(user.clerkUserId),
  ]);
  const styles = [...selectableStyles.system, ...selectableStyles.mine];
  const subscribed = isSubscriptionActive(sub);
  const characterLimit = characterAllowance(subscribed && sub ? sub.planId : null, user.email);

  return (
    <div>
      <CharactersHeader
        credits={user.credits}
        subscribed={subscribed}
        styles={styles}
        characterCount={characterCount}
        characterLimit={characterLimit}
      />
      <div className="mt-8">
        <CharacterGrid
          characters={docs.map(toPublicCharacter)}
          credits={user.credits}
          subscribed={subscribed}
          styles={styles}
          atCharacterLimit={characterLimit != null && characterCount >= characterLimit}
        />
      </div>
    </div>
  );
}

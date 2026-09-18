import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { toPublicCharacter } from "@/lib/serialize";
import { listPublicStyles } from "@/lib/styles/list";
import type { Character } from "@/types/character";
import { CharacterGrid } from "./character-grid";
import { CreateCharacterButton } from "./create-character-modal";

export default async function CharactersPage() {
  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  const characters = await charactersCollection();
  const docs = (await characters
    .find({ clerkUserId: user.clerkUserId })
    .sort({ updatedAt: -1 })
    .limit(120)
    .toArray()) as Character[];
  // Visual styles with preview cards for the create dialog.
  const styles = await listPublicStyles();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">角色</h1>
          <p className="mt-2 text-sm text-muted">
            建立可重複使用的角色藍圖。每個版本扣 1 credit，可從任一版本再編輯。
          </p>
        </div>
        <CreateCharacterButton credits={user.credits} subscribed={subscribed} styles={styles} />
      </div>
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

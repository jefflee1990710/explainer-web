import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { characterAllowance } from "@/service/character/character-limit";
import { charactersCollection } from "@/dao";
import { listSelectableStyles } from "@/service/style/list";
import { CharacterGeneratorForm } from "@/presentation/components/app/characters/character-generator-form";

export default async function CharacterGeneratorPage() {
  const user = await requireAppUser();
  const characters = await charactersCollection();
  const [sub, characterCount, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters.countDocuments({ clerkUserId: user.clerkUserId }),
    listSelectableStyles(user.clerkUserId),
  ]);
  const styles = [...selectableStyles.system, ...selectableStyles.mine];
  const subscribed = isSubscriptionActive(sub);
  const characterLimit = characterAllowance(subscribed && sub ? sub.planId : null, user.email);

  return (
    <CharacterGeneratorForm
      credits={user.credits}
      subscribed={subscribed}
      styles={styles}
      atCharacterLimit={characterLimit != null && characterCount >= characterLimit}
    />
  );
}

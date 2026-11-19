import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { characterAllowance, countedCharacterFilter } from "@/service/character/character-limit";
import { charactersCollection } from "@/dao";
import { listSelectableStyles } from "@/service/style/list";
import { CharacterGeneratorForm } from "@/presentation/components/app/characters/character-generator-form";

export default async function CharacterGeneratorPage() {
  const user = await requireAppUser();
  const characters = await charactersCollection();
  const [sub, characterCount, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters.countDocuments(countedCharacterFilter(user.clerkUserId)),
    listSelectableStyles(user.clerkUserId),
  ]);
  const styles = [...selectableStyles.system, ...selectableStyles.mine];
  const subscribed = isSubscriptionActive(sub);
  const characterLimit = characterAllowance(subscribed && sub ? sub.planId : null, user.email);

  return (
    <CharacterGeneratorForm
      credits={resolveUserUsdBalance(user).creditUsd}
      subscribed={subscribed}
      styles={styles}
      atCharacterLimit={characterLimit != null && characterCount >= characterLimit}
    />
  );
}

import { charactersCollection } from "@/dao";
import type { Character } from "@/model/character";
import { toPublicCharacter } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listSelectableStyles } from "@/service/style/list";

// Everything the fitting room needs: the user's characters (newest first), wallet, and style names.
export async function loadRoomData() {
  const user = await requireAppUser();
  const characters = await charactersCollection();
  const [sub, docs, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    listSelectableStyles(user.clerkUserId),
  ]);
  return {
    characters: docs.map(toPublicCharacter),
    credits: user.credits,
    subscribed: isSubscriptionActive(sub),
    styles: [...selectableStyles.system, ...selectableStyles.mine],
  };
}

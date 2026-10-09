import { charactersCollection } from "@/dao";
import { readFormData } from "@/service/api/form";
import { apiJson, fromResult, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { createCharacterAction } from "@/service/character/actions";
import { characterAllowance } from "@/service/character/character-limit";
import { listSelectableStyles } from "@/service/style/list";
import { toPublicCharacter } from "@/presentation/serialize";
import type { Character } from "@/model/character";

// Character library plus the style list the create sheet needs.
export const GET = withApiUser(async ({ auth }) => {
  const { user } = auth;
  const characters = await charactersCollection();
  const [sub, docs, count, selectable] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    characters.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).toArray() as Promise<Character[]>,
    characters.countDocuments({ clerkUserId: user.clerkUserId }),
    listSelectableStyles(user.clerkUserId),
  ]);
  const subscribed = isSubscriptionActive(sub);
  const limit = characterAllowance(subscribed && sub ? sub.planId : null, user.email);
  return apiJson({
    characters: docs.map(toPublicCharacter),
    styles: [...selectable.system, ...selectable.mine],
    count,
    limit,
    credits: user.credits,
    subscribed,
  });
});

// Create a character and queue its first blueprint.
// Body keys: name, styleId, prompt, referenceImageUrl[] (uploaded via /uploads), voice? (object).
export const POST = withApiUser(async ({ request }) => {
  const form = await readFormData(request);
  return fromResult(await createCharacterAction(form), 201);
});

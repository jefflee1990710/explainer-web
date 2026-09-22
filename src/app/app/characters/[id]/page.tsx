import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { charactersCollection } from "@/dao";
import { toPublicCharacter } from "@/presentation/serialize";
import type { Character } from "@/model/character";
import { CharacterWorkspace } from "@/presentation/components/app/characters/[id]/character-workspace";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) notFound();

  const characters = await charactersCollection();
  const character = (await characters.findOne({
    _id: new ObjectId(id),
    clerkUserId: user.clerkUserId,
  })) as Character | null;
  if (!character) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);

  return (
    <Suspense fallback={<div className="h-64 rounded-[1.5rem] bg-accent-ink/5" />}>
      <CharacterWorkspace
        character={toPublicCharacter(character)}
        credits={user.credits}
        subscribed={isSubscriptionActive(sub)}
      />
    </Suspense>
  );
}

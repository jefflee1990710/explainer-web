import { Suspense } from "react";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { charactersCollection, videosCollection } from "@/dao";
import {
  toPublicCharacter,
  toPublicVideoCard,
  VIDEO_LIST_PROJECTION,
} from "@/presentation/serialize";
import type { Character } from "@/model/character";
import type { Project } from "@/model/project";
import { listSelectableStyles } from "@/service/style/list";
import { HomeView } from "@/presentation/components/app/home-view";

export default async function DashboardPage() {
  const user = await requireAppUser();
  const [videos, characters] = await Promise.all([
    videosCollection(),
    charactersCollection(),
  ]);
  const [sub, videoDocs, charDocs, selectableStyles] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    videos
      .find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(12)
      .toArray(),
    characters
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .limit(12)
      .toArray() as Promise<Character[]>,
    listSelectableStyles(user.clerkUserId),
  ]);

  const subscribed = isSubscriptionActive(sub);
  const cards = (videoDocs as Project[]).map(toPublicVideoCard);
  const publicCharacters = charDocs.map(toPublicCharacter);
  const styles = [...selectableStyles.system, ...selectableStyles.mine];

  return (
    <Suspense fallback={null}>
      <HomeView
        videos={cards}
        characters={publicCharacters}
        styles={styles}
        credits={user.credits}
        subscribed={subscribed}
      />
    </Suspense>
  );
}

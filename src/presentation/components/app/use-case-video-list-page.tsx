import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { videosCollection } from "@/dao";
import { toPublicVideoCard, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Project } from "@/model/project";
import { loadFolderOptions } from "@/service/project/load-folder-studio";
import { DashboardView } from "@/presentation/components/app/dashboard-view";
import {
  newVideoPathForUseCase,
  videoMatchesUseCase,
  type VideoUseCase,
} from "@/service/video/use-case";

/** Shared RSC loader for Explainer / Talking Head Create lists. */
export async function UseCaseVideoListPage({
  useCase,
  searchParams,
}: {
  useCase: VideoUseCase;
  searchParams?: Promise<{ stay?: string; project?: string }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const user = await requireAppUser();
  const videos = await videosCollection();
  const [sub, folderOptions, videoDocs] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    loadFolderOptions(user.clerkUserId),
    videos
      .find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray(),
  ]);

  const cards = (videoDocs as Project[]).map(toPublicVideoCard);
  const matching = cards.filter((video) => videoMatchesUseCase(video.skillSlug, useCase));

  // Empty use-case list opens create with that preset (unless user forced stay).
  if (matching.length === 0 && query?.stay !== "1") {
    redirect(newVideoPathForUseCase(useCase));
  }

  const subscribed = isSubscriptionActive(sub);

  return (
    <Suspense fallback={null}>
      <DashboardView
        videos={cards}
        folders={folderOptions}
        credits={user.credits}
        subscribed={subscribed}
        useCase={useCase}
      />
    </Suspense>
  );
}

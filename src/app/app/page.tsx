import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { videosCollection } from "@/dao";
import { toPublicVideoCard, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Project } from "@/model/project";
import { loadFolderOptions } from "@/service/project/load-folder-studio";
import { DashboardView } from "@/presentation/components/app/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ stay?: string }>;
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

  // First video skips the list. Stay on the list when the user came back from the editor.
  if (videoDocs.length === 0 && query?.stay !== "1") {
    redirect("/app/videos/new");
  }

  const subscribed = isSubscriptionActive(sub);
  const cards = (videoDocs as Project[]).map(toPublicVideoCard);

  return (
    <Suspense fallback={null}>
      <DashboardView
        videos={cards}
        folders={folderOptions}
        credits={user.credits}
        subscribed={subscribed}
      />
    </Suspense>
  );
}

import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { projectsCollection, videosCollection } from "@/dao";
import { toPublicFolder } from "@/presentation/serialize";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import { DashboardView } from "@/presentation/components/app/dashboard-view";

export default async function DashboardPage() {
  const user = await requireAppUser();
  const folders = await projectsCollection();
  const videos = await videosCollection();
  const [sub, folderDocs, videoDocs] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    folders
      .find({ clerkUserId: user.clerkUserId, name: { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(120)
      .toArray(),
    videos.find({ clerkUserId: user.clerkUserId }).toArray(),
  ]);
  const subscribed = isSubscriptionActive(sub);
  const videosByFolder = new Map<string, Project[]>();
  for (const video of videoDocs) {
    // Skip leftover rows that were never wrapped into a folder.
    if (!video.projectId) continue;
    const key = video.projectId.toHexString();
    const list = videosByFolder.get(key) || [];
    list.push(video as Project);
    videosByFolder.set(key, list);
  }
  const publicFolders = folderDocs.map((folder) =>
    toPublicFolder(
      folder as Folder,
      videosByFolder.get(folder._id!.toHexString()) || [],
    ),
  );

  return (
    <DashboardView
      folders={publicFolders}
      credits={user.credits}
      subscribed={subscribed}
    />
  );
}

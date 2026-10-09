import { projectsCollection, videosCollection } from "@/dao";
import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { createFolderAction } from "@/service/project/actions";
import { toPublicFolder, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";

// Dashboard: every folder with its video cards (same query as /app page).
export const GET = withApiUser(async ({ auth }) => {
  const { user } = auth;
  const folders = await projectsCollection();
  const videos = await videosCollection();
  const [sub, folderDocs, videoDocs] = await Promise.all([
    getActiveSubscription(user.clerkUserId),
    folders
      .find({ clerkUserId: user.clerkUserId, name: { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(120)
      .toArray(),
    videos.find({ clerkUserId: user.clerkUserId }, { projection: VIDEO_LIST_PROJECTION }).toArray(),
  ]);
  const videosByFolder = new Map<string, Project[]>();
  for (const video of videoDocs) {
    if (!video.projectId) continue;
    const key = video.projectId.toHexString();
    const list = videosByFolder.get(key) || [];
    list.push(video as Project);
    videosByFolder.set(key, list);
  }
  return apiJson({
    folders: folderDocs.map((folder) =>
      toPublicFolder(folder as Folder, videosByFolder.get(folder._id!.toHexString()) || []),
    ),
    credits: user.credits,
    subscribed: isSubscriptionActive(sub),
  });
});

// Create a folder (campaign).
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ name?: string }>(request);
  return fromResult(await createFolderAction(String(body.name ?? "")), 201);
});

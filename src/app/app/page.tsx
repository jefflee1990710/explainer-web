import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { projectsCollection, videosCollection } from "@/lib/collections";
import { toPublicFolder } from "@/lib/serialize";
import type { Folder } from "@/types/folder";
import type { Project } from "@/types/project";
import { CreateFolderButton } from "./create-folder-modal";
import { ProjectGrid } from "./project-grid";

export default async function DashboardPage() {
  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  const folders = await projectsCollection();
  const videos = await videosCollection();
  const folderDocs = await folders
    .find({ clerkUserId: user.clerkUserId, name: { $exists: true } })
    .sort({ updatedAt: -1 })
    .limit(120)
    .toArray();
  const videoDocs = await videos.find({ clerkUserId: user.clerkUserId }).toArray();
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
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">專案</h1>
          <p className="mt-2 text-sm text-muted">
            {subscribed
              ? `目前方案可產片，剩餘 ${user.credits} credits。`
              : "尚未訂閱。你可以先寫分鏡，核准產片前需要方案。"}
          </p>
        </div>
        <CreateFolderButton />
      </div>

      {!subscribed ? (
        <div className="mt-6 rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-5 text-sm shadow-[4px_4px_0_0_rgba(255,77,46,0.2)]">
          還沒有有效訂閱。
          <Link href="/app/billing" className="ml-2 font-semibold underline">
            前往訂閱
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        <ProjectGrid folders={publicFolders} />
      </div>
    </div>
  );
}

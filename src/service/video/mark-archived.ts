import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";

export type MarkArchivedResult = { ok: true } | { ok: false; error: string };

// Archive any video the user owns. It leaves the other list filters.
export async function markVideoArchivedAction(videoId: string): Promise<MarkArchivedResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };

  const videos = await videosCollection();
  const video = await videos.findOne({
    _id: new ObjectId(videoId),
    clerkUserId: user.clerkUserId,
  });
  if (!video) return { ok: false, error: "專案不存在" };

  const now = new Date();
  await videos.updateOne({ _id: video._id }, { $set: { archivedAt: now, updatedAt: now } });
  revalidatePath("/app");
  if (video.projectId) revalidatePath(`/app/projects/${video.projectId.toHexString()}`);
  return { ok: true };
}

// Put an archived video back on its real list stage by clearing archivedAt.
export async function unarchiveVideoAction(videoId: string): Promise<MarkArchivedResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };

  const videos = await videosCollection();
  const video = await videos.findOne({
    _id: new ObjectId(videoId),
    clerkUserId: user.clerkUserId,
  });
  if (!video) return { ok: false, error: "專案不存在" };

  const now = new Date();
  await videos.updateOne(
    { _id: video._id },
    { $unset: { archivedAt: "" }, $set: { updatedAt: now } },
  );
  revalidatePath("/app");
  if (video.projectId) revalidatePath(`/app/projects/${video.projectId.toHexString()}`);
  return { ok: true };
}

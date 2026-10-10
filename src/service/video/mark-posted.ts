import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { isProjectReady } from "@/service/clip-stage";

export type MarkPostedResult = { ok: true } | { ok: false; error: string };

// Mark a finished video as posted. Pending to post is the default, so this only sets the flag.
export async function markVideoPostedAction(videoId: string): Promise<MarkPostedResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };

  const videos = await videosCollection();
  const video = await videos.findOne({
    _id: new ObjectId(videoId),
    clerkUserId: user.clerkUserId,
  });
  if (!video) return { ok: false, error: "專案不存在" };
  if (!isProjectReady(video)) return { ok: false, error: "請等全部片段完成再標為已發佈" };

  const now = new Date();
  await videos.updateOne({ _id: video._id }, { $set: { postedAt: now, updatedAt: now } });
  revalidatePath(`/app/projects/${video.projectId.toHexString()}`);
  return { ok: true };
}

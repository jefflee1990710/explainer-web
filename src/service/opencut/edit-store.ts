import { ObjectId } from "mongodb";
import { opencutEditsCollection } from "@/dao/opencut-edits";
import { videosCollection } from "@/dao/videos";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import { requireClerkUserId } from "@/service/auth";
import { sanitizeOpencutEdit } from "@/service/opencut/edit-document";

export type OpencutEditSnapshot = {
  project: Record<string, unknown>;
  media: OpencutEditMedia[];
  updatedAt: string;
};

async function ownedVideo(videoId: string, clerkUserId: string) {
  if (!ObjectId.isValid(videoId)) return null;
  const videos = await videosCollection();
  return videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
}

export async function getOpencutEdit(videoId: string): Promise<OpencutEditSnapshot | null> {
  const clerkUserId = await requireClerkUserId();
  const video = await ownedVideo(videoId, clerkUserId);
  if (!video) return null;
  const edits = await opencutEditsCollection();
  const edit = await edits.findOne({ _id: video._id, clerkUserId });
  if (!edit) return null;
  return {
    project: edit.project,
    media: edit.media,
    updatedAt: edit.updatedAt.toISOString(),
  };
}

/** Drop the saved cut so the next open follows the new storyboard. */
export async function deleteOpencutEdit(videoId: string): Promise<void> {
  const clerkUserId = await requireClerkUserId();
  const video = await ownedVideo(videoId, clerkUserId);
  if (!video) return;
  const edits = await opencutEditsCollection();
  await edits.deleteOne({ _id: video._id, clerkUserId });
}

export async function saveOpencutEdit(input: {
  videoId: string;
  project: unknown;
  media: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const clerkUserId = await requireClerkUserId();
  const video = await ownedVideo(input.videoId, clerkUserId);
  if (!video) return { ok: false, error: "影片不存在" };
  const clean = sanitizeOpencutEdit({ project: input.project, media: input.media });
  if (!clean) return { ok: false, error: "剪輯內容無法儲存" };
  const edits = await opencutEditsCollection();
  await edits.updateOne(
    { _id: video._id },
    {
      $set: {
        clerkUserId,
        project: clean.project,
        media: clean.media,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return { ok: true };
}

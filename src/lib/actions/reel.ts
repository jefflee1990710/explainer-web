"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { videosCollection } from "@/lib/collections";
import { isProjectReady } from "@/lib/clip-stage";
import { runReelJob } from "@/lib/director/jobs";
import { isProductionLike } from "@/lib/project-status";
import {
  clipReelFingerprint,
  isReelBusy,
  isReelCurrent,
} from "@/lib/reel/fingerprint";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";

type ProjectResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

function revalidateProject(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
}

// Queue reel concat once every clip is video_ready. Idempotent for the
// current clip fingerprint; a redo invalidates the previous file.
export async function composeReelAction(videoId: string): Promise<ProjectResult> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };

  const projects = await videosCollection();
  const project = await projects.findOne({
    _id: new ObjectId(videoId),
    clerkUserId: user.clerkUserId,
  });
  if (!project) return { ok: false, error: "專案不存在" };
  if (!isProductionLike(project.status)) return { ok: false, error: "請先核准分鏡" };
  if (!isProjectReady(project)) return { ok: false, error: "請先完成所有片段" };

  const fingerprint = clipReelFingerprint(project);
  if (isReelCurrent(project)) {
    return { ok: true, project: toPublicVideo(project) };
  }
  if (isReelBusy(project.reelStatus) && project.reelFingerprint === fingerprint) {
    return { ok: true, project: toPublicVideo(project) };
  }

  const now = new Date();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        reelStatus: "queued",
        reelFingerprint: fingerprint,
        updatedAt: now,
      },
      $unset: { reelError: "" },
    },
  );

  after(() => runReelJob(project._id, fingerprint));
  revalidateProject(project.projectId.toHexString());

  const updated = await projects.findOne({ _id: project._id });
  if (!updated) return { ok: false, error: "專案不存在" };
  return { ok: true, project: toPublicVideo(updated) };
}

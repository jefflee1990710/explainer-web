import { generationJobsCollection, videosCollection } from "@/dao";
import { refundCredits } from "@/service/billing/credits";
import { chargedVideoCredits } from "@/service/credit-costs";
import { nextProjectStatus } from "@/service/higgsfield/reconcile";
import type { Project, ProjectClip } from "@/model/project";

export const CLIP_ALREADY_SENT = "這段已經送出，無法取消";

// Pending video jobs are still ours. A sent job is provider `queued` and stays.
export function clipsWithUnsentFlag(clips: ProjectClip[], pendingClipIndexes: ReadonlySet<number>) {
  return clips.map((clip) =>
    clip.status === "queued"
      ? { ...clip, unsent: pendingClipIndexes.has(clip.clipNumber - 1) }
      : clip,
  );
}

export async function markUnsentClipVideos(project: Project): Promise<Project> {
  if (!project.clips.some((clip) => clip.status === "queued")) return project;
  const jobs = await generationJobsCollection();
  const pending = await jobs
    .find({ projectId: project._id, kind: "video", status: "pending" })
    .project({ clipIndex: 1 })
    .toArray();
  return {
    ...project,
    clips: clipsWithUnsentFlag(project.clips, new Set(pending.map((job) => job.clipIndex))),
  };
}

// Drop a video that has not been sent, refund its charge, and leave the frames.
export async function cancelPendingClipVideo(
  clerkUserId: string,
  project: Project,
  clipNumber: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  if (!clip || clip.status !== "queued") return { ok: false, error: CLIP_ALREADY_SENT };

  const jobs = await generationJobsCollection();
  const removed = await jobs.findOneAndDelete({
    projectId: project._id,
    kind: "video",
    clipIndex: clipNumber - 1,
    status: "pending",
  });
  if (!removed) return { ok: false, error: CLIP_ALREADY_SENT };

  const clips = project.clips.filter((item) => item.clipNumber !== clipNumber);
  const projects = await videosCollection();
  const claim = clip.submittedAt
    ? { clipNumber, status: "queued" as const, submittedAt: clip.submittedAt }
    : { clipNumber, status: "queued" as const };
  const updated = await projects.findOneAndUpdate(
    {
      _id: project._id,
      clips: { $elemMatch: claim },
    },
    {
      $pull: { clips: { clipNumber } },
      $set: {
        status: nextProjectStatus({ ...project, clips }),
        updatedAt: new Date(),
      },
    },
  );
  if (!updated) {
    await jobs.insertOne(removed);
    return { ok: false, error: CLIP_ALREADY_SENT };
  }

  await refundCredits(clerkUserId, chargedVideoCredits(clip));
  return { ok: true };
}

import { isProjectReady, type ClipStageSource } from "@/service/clip-stage";
import { mediaSrc } from "@/util/media-src";
import { normalizeProjectStatus } from "@/service/project-status";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { ClipFrame, ProjectClip, ProjectStatus } from "@/model/project";

export function toFrameStatus(status?: GenerationStatus): ClipFrame["status"] {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "nsfw") return "failed";
  if (status === "in_progress") return "in_progress";
  return "queued";
}

export const toClipStatus: (status?: GenerationStatus) => ProjectClip["status"] =
  toFrameStatus;

// A redo leaves the previous job around until it is deleted; the newest one is current.
function newest(jobs: GenerationJob[]): GenerationJob | undefined {
  return jobs
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

// `submittedAt` is written the moment the user claims a frame or a video, before
// the new job exists. A job created earlier belongs to the previous attempt:
// applying it would undo the claim and re-enable the paid button mid-flight.
// Legacy entries have no `submittedAt` and keep the old, unguarded behaviour.
function appliesToClaim(job: GenerationJob, submittedAt?: string) {
  if (!submittedAt) return true;
  const claimedAt = Date.parse(submittedAt);
  if (Number.isNaN(claimedAt)) return true;
  return job.createdAt.getTime() >= claimedAt;
}

// Copy status/urls from each frame's newest job; frames without a job keep their stored values.
export function reconcileFrames(frames: ClipFrame[], jobs: GenerationJob[]): ClipFrame[] {
  return frames.map((frame) => {
    const job = newest(
      jobs.filter(
        (item) =>
          item.kind === "frame" &&
          item.clipIndex === frame.clipNumber - 1 &&
          item.framePosition === frame.position,
      ),
    );
    if (!job || !appliesToClaim(job, frame.submittedAt)) return frame;
    const nextUrl = mediaSrc(job);
    const pending = job.status === "queued" || job.status === "in_progress";
    return {
      ...frame,
      status: toFrameStatus(job.status),
      // Pending redo must clear the previous still so the tile can show
      // loading. Failed / completed-without-a-file keep the last image.
      outputUrl: nextUrl ? job.outputUrl : pending ? undefined : frame.outputUrl ?? job.outputUrl,
      blobUrl: nextUrl ? job.blobUrl || job.outputUrl : pending ? undefined : frame.blobUrl ?? job.blobUrl,
      error: job.error,
    };
  });
}

// Same for clip videos.
export function reconcileClips(clips: ProjectClip[] | undefined, jobs: GenerationJob[]): ProjectClip[] {
  return (clips || []).map((clip) => {
    const job = newest(
      jobs.filter((item) => item.kind === "video" && item.clipIndex === clip.clipNumber - 1),
    );
    if (!job || !appliesToClaim(job, clip.submittedAt)) return clip;
    const status = toClipStatus(job.status);
    const nextUrl = mediaSrc(job);
    const pending = job.status === "queued" || job.status === "in_progress";
    return {
      ...clip,
      status,
      // Pending redo must clear the previous file so the panel can show
      // loading. Failed / completed-without-a-file keep the last video.
      outputUrl: nextUrl ? job.outputUrl : pending ? undefined : clip.outputUrl ?? job.outputUrl,
      blobUrl: nextUrl ? job.blobUrl || job.outputUrl : pending ? undefined : clip.blobUrl ?? job.blobUrl,
      error: job.error,
    };
  });
}

// Only production-family projects flip between production and ready; every
// other status passes through (normalised, so legacy values never get re-written).
export function nextProjectStatus(project: ClipStageSource): ProjectStatus {
  const status = normalizeProjectStatus(project.status);
  // Leftover 核准分鏡 projects produce like production and can become ready.
  if (status !== "production" && status !== "ready" && status !== "awaiting_approval") {
    return status;
  }
  return isProjectReady(project) ? "ready" : "production";
}

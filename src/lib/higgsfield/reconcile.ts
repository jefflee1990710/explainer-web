import { isProjectReady, type ClipStageSource } from "@/lib/clip-stage";
import { normalizeProjectStatus } from "@/lib/project-status";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type { ClipFrame, ProjectClip, ProjectStatus } from "@/types/project";

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
    return {
      ...frame,
      status: toFrameStatus(job.status),
      outputUrl: job.outputUrl,
      blobUrl: job.blobUrl,
      error: job.error,
    };
  });
}

// Same for clip videos.
export function reconcileClips(clips: ProjectClip[], jobs: GenerationJob[]): ProjectClip[] {
  return clips.map((clip) => {
    const job = newest(
      jobs.filter((item) => item.kind === "video" && item.clipIndex === clip.clipNumber - 1),
    );
    if (!job || !appliesToClaim(job, clip.submittedAt)) return clip;
    const status = toClipStatus(job.status);
    const pending = status === "queued" || status === "in_progress";
    return {
      ...clip,
      status,
      // A fresh job carries no media yet; the previous video stays playable
      // (the panel dims it and marks it 重產中) until the new one replaces it.
      outputUrl: pending ? clip.outputUrl ?? job.outputUrl : job.outputUrl,
      blobUrl: pending ? clip.blobUrl ?? job.blobUrl : job.blobUrl,
      error: job.error,
    };
  });
}

// Only production-family projects flip between production and ready; every
// other status passes through (normalised, so legacy values never get re-written).
export function nextProjectStatus(project: ClipStageSource): ProjectStatus {
  const status = normalizeProjectStatus(project.status);
  if (status !== "production" && status !== "ready") return status;
  return isProjectReady(project) ? "ready" : "production";
}

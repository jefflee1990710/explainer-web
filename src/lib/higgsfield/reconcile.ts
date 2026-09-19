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
    if (!job) return frame;
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
    if (!job) return clip;
    return {
      ...clip,
      status: toClipStatus(job.status),
      outputUrl: job.outputUrl,
      blobUrl: job.blobUrl,
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

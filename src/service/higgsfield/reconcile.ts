import { isProjectReady, type ClipStageSource } from "@/service/clip-stage";
import { mediaSrc } from "@/util/media-src";
import { normalizeProjectStatus } from "@/service/project-status";
import { isJobInFlight } from "@/service/generation/task-policy";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { ClipFrame, OnscreenTextItem, ProjectClip, ProjectStatus } from "@/model/project";

function mediaPath(url?: string) {
  return (url ?? "").split("?")[0]?.trim() ?? "";
}

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
    const pending = isJobInFlight(job.status);
    const next: ClipFrame = {
      ...frame,
      status: toFrameStatus(job.status),
      // Pending redo must clear the previous still so the tile can show
      // loading. Failed / completed-without-a-file keep the last image.
      outputUrl: nextUrl ? job.outputUrl : pending ? undefined : frame.outputUrl ?? job.outputUrl,
      // Never copy the provider CDN into blobUrl — that stops the poller.
      blobUrl: nextUrl ? job.blobUrl : pending ? undefined : frame.blobUrl ?? job.blobUrl,
      error: job.error,
    };
    // A new still, or a redo still in flight, must not keep the old subtitle composite.
    if (pending || (frame.mergedSceneUrl && mediaSrc(next) !== frame.mergedSceneUrl)) {
      delete next.mergedUrl;
      delete next.mergedSceneUrl;
      delete next.mergedPlateUrl;
      delete next.mergedAt;
    }
    return next;
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
    const pending = isJobInFlight(job.status);
    return {
      ...clip,
      status,
      // Pending redo must clear the previous file so the panel can show
      // loading. Failed / completed-without-a-file keep the last video.
      outputUrl: nextUrl ? job.outputUrl : pending ? undefined : clip.outputUrl ?? job.outputUrl,
      blobUrl: nextUrl ? job.blobUrl : pending ? undefined : clip.blobUrl ?? job.blobUrl,
      error: job.error,
    };
  });
}

// A finished paint whose base is the file currently on the clip. A newer video
// uses a different file, so an older paint is left off.
export function withFinishedOnScreenPaint(
  clips: ProjectClip[],
  items: OnscreenTextItem[] | undefined,
): ProjectClip[] {
  return clips.map((clip) => {
    if (clip.status === "in_progress" || clip.status === "queued") return clip;
    const current = mediaPath(mediaSrc(clip));
    if (!current) return clip;
    const paint = [...(items ?? [])]
      .reverse()
      .find((item) => {
        if ((item.clipIndex ?? 0) !== clip.clipNumber - 1) return false;
        if (item.status !== "completed" || !item.inpaintedVideoUrl?.startsWith("https://")) return false;
        const painted = mediaPath(item.inpaintedVideoUrl);
        const base = mediaPath(item.baseVideoUrl);
        if (!base || !painted) return false;
        return current === base || current === painted;
      });
    if (!paint?.inpaintedVideoUrl || mediaPath(paint.inpaintedVideoUrl) === current) return clip;
    const next: ProjectClip = {
      ...clip,
      status: "completed",
      blobUrl: paint.inpaintedVideoUrl,
      outputUrl: paint.inpaintedVideoUrl,
    };
    delete next.error;
    return next;
  });
}

// The video job still points at the unpainted file. A finished on-screen paint
// for that same file has to stay on the clip, or the next sync puts the original back.
// A clip whose video is still generating keeps that in-progress state.
export function keepOnScreenPaintOnClips(
  clips: ProjectClip[],
  jobs: GenerationJob[],
  items: OnscreenTextItem[] | undefined,
): ProjectClip[] {
  const held = clips.map((clip) => {
    const videoJob = newest(
      jobs.filter((item) => item.kind === "video" && item.clipIndex === clip.clipNumber - 1),
    );
    if (videoJob && isJobInFlight(videoJob.status)) return clip;
    return null;
  });
  const painted = withFinishedOnScreenPaint(clips, items);
  return painted.map((clip, index) => held[index] ?? clip);
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

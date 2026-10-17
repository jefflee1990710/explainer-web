import { normalizeProjectStatus } from "@/service/project-status";
import { collectVideoBlobUrls } from "@/service/video/storage";
import type { GenerationKind } from "@/model/generation-job";
import type { Project } from "@/model/project";

type JobBlob = { blobUrl?: string };
type OpencutMediaBlob = { sourceUrl?: string };

// Fields read by the guard, so both the Mongo `Project` and `PublicVideo` fit.
type RestartGuardSource = Pick<Project, "status" | "clips" | "reelStatus" | "finalStatus">;

const RUNNING = new Set(["queued", "in_progress"]);

// Image jobs restart may cancel: their credit is refunded and nothing writes back.
export const RESTART_CANCELLABLE_KINDS: GenerationKind[] = [
  "frame",
  "objectSheet",
  "backgroundPlate",
  "subtitlePlate",
];

// Scene images may still be generating; restart cancels and refunds them.
// Phase A, clip videos, and exports still block: those cannot be cancelled cleanly.
export function restartBlockReason(video: RestartGuardSource): string | null {
  const clipVideoBusy = video.clips.some(
    (clip) => RUNNING.has(clip.status) || (clip.status === "completed" && !clip.blobUrl),
  );
  if (
    normalizeProjectStatus(video.status) === "phase_a" ||
    clipVideoBusy ||
    RUNNING.has(video.reelStatus || "") ||
    RUNNING.has(video.finalStatus || "")
  ) {
    return "請等目前的產生工作結束再重新開始";
  }
  return null;
}

// Credits to return for unfinished image jobs that restart cancels.
// Subtitle plates refund what their plate row charged.
export function restartRefundFor(
  video: Pick<Project, "subtitlePlates">,
  job: { kind: GenerationKind; clipIndex: number },
  frameCost: number,
): number {
  if (job.kind !== "subtitlePlate") return frameCost;
  const plate = video.subtitlePlates?.find((item) => item.clipNumber === job.clipIndex + 1);
  return plate?.creditsCharged ?? frameCost;
}

// Generated media to delete. The uploaded character image is part of the brief.
export function restartBlobUrls(
  video: Project,
  jobs: JobBlob[] = [],
  opencutMedia: OpencutMediaBlob[] = [],
) {
  return collectVideoBlobUrls(video, jobs, opencutMedia).filter(
    (url) => url !== video.characterImageUrl,
  );
}

// Storyboard and every generated output. Brief, cast, and branding edit stay.
export const RESTART_UNSET_FIELDS = {
  phaseA: "",
  phaseB: "",
  frames: "",
  // Plates belong to the storyboard; phase A writes the overlay flag again.
  subtitlePlates: "",
  subtitleOverlay: "",
  characterStillUrl: "",
  stillError: "",
  objectSheetItems: "",
  objectSheetUrl: "",
  objectSheetError: "",
  lockRevision: "",
  backgroundPlates: "",
  backgroundPlateError: "",
  autoVideoClips: "",
  framesSubmittedAt: "",
  framesCreditCost: "",
  framesCharged: "",
  reelUrl: "",
  reelStatus: "",
  reelFingerprint: "",
  reelError: "",
  reelStep: "",
  reelAttempts: "",
  finalUrl: "",
  finalStatus: "",
  finalFingerprint: "",
  finalError: "",
  finalQueuedAt: "",
  postedAt: "",
  archivedAt: "",
  error: "",
} as const;

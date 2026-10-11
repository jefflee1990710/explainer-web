import { isProjectBusy } from "@/service/clip-stage";
import { collectVideoBlobUrls } from "@/service/video/storage";
import type { Project } from "@/model/project";

type JobBlob = { blobUrl?: string };

const RUNNING = new Set(["queued", "in_progress"]);

// Running jobs already took credits and still write back, so never wipe under them.
export function restartBlockReason(video: Project): string | null {
  if (
    isProjectBusy(video) ||
    RUNNING.has(video.reelStatus || "") ||
    RUNNING.has(video.finalStatus || "")
  ) {
    return "請等目前的產生工作結束再重新開始";
  }
  return null;
}

// Generated media to delete. The uploaded character image is part of the brief.
export function restartBlobUrls(video: Project, jobs: JobBlob[] = []) {
  return collectVideoBlobUrls(video, jobs).filter((url) => url !== video.characterImageUrl);
}

// Storyboard and every generated output. Brief, cast, and branding edit stay.
export const RESTART_UNSET_FIELDS = {
  phaseA: "",
  phaseB: "",
  frames: "",
  characterStillUrl: "",
  stillError: "",
  objectSheetItems: "",
  objectSheetUrl: "",
  objectSheetError: "",
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
  error: "",
} as const;

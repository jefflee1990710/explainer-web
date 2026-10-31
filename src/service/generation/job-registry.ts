import {
  failCharacterVersion,
  markCharacterProfileFailed,
  syncCharacterJob,
} from "@/service/character/sync";
import { syncDirectorPreviewJob } from "@/service/director/director-preview";
import { syncSubtitlePlateJob } from "@/service/higgsfield/subtitle-plate-job";
import { syncOnscreenTextJob } from "@/service/opencut/on-screen-text";
import { syncPostPreviewJob } from "@/service/post/sync-preview";
import { failProduct, syncProductJob } from "@/service/product/sync";
import { syncStylePreviewJob } from "@/service/style/user-style-preview";
import { syncTextStylePreviewJob } from "@/service/text-style/preview";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import { failPoseEdit, syncPoseEditJob } from "@/service/pose-edit/sync";
import { syncReelCoverJob } from "@/service/video-edit/reel-cover";
import type {
  GenerationJob,
  GenerationKind,
  GenerationStatus,
} from "@/model/generation-job";

// Job kinds that persist and settle onto their own domain document rather than
// going through the main clip/frame reconciliation path in `videos`.
export const SELF_SYNCING_JOB_KINDS = [
  "reelCover",
  "directorPreview",
  "product",
  "postPreview",
  "stylePreview",
  "textStylePreview",
  "subtitlePlate",
  "onscreenText",
  "character",
  "poseEdit",
] as const satisfies readonly GenerationKind[];

export type SelfSyncingJobKind = (typeof SELF_SYNCING_JOB_KINDS)[number];

const SELF_SYNCING_SET: ReadonlySet<GenerationKind> = new Set(SELF_SYNCING_JOB_KINDS);

export function isSelfSyncingJobKind(kind: GenerationKind): kind is SelfSyncingJobKind {
  return SELF_SYNCING_SET.has(kind);
}

// Job kinds polled directly by `refreshSubmittedJobs` (not driven by `refreshProjectJobs`).
export const STANDALONE_POLLED_JOB_KINDS = [
  "character",
  "stylePreview",
  "textStylePreview",
  "directorPreview",
  "reelCover",
  "postPreview",
  "product",
] as const satisfies readonly GenerationKind[];

export type StandalonePolledJobKind = (typeof STANDALONE_POLLED_JOB_KINDS)[number];

const STANDALONE_POLLED_SET: ReadonlySet<GenerationKind> = new Set(
  STANDALONE_POLLED_JOB_KINDS,
);

export function isStandalonePolledJobKind(
  kind: GenerationKind,
): kind is StandalonePolledJobKind {
  return STANDALONE_POLLED_SET.has(kind);
}

// Video lock jobs share a project credit fence and lock-sheet sync.
export const VIDEO_LOCK_JOB_KINDS = [
  "objectSheet",
  "backgroundPlate",
] as const satisfies readonly GenerationKind[];

export type VideoLockJobKind = (typeof VIDEO_LOCK_JOB_KINDS)[number];

export function isVideoLockJobKind(kind: GenerationKind): kind is VideoLockJobKind {
  return kind === "objectSheet" || kind === "backgroundPlate";
}

type SelfSyncHandler = {
  syncStatus: (
    job: GenerationJob,
    status: GenerationStatus,
    outputUrl?: string,
    errorMessage?: string,
  ) => Promise<void>;
  failClaimed: (job: GenerationJob, error: string) => Promise<void>;
};

// Handler registry mapping each self-syncing job kind to its status & failure callbacks.
const SELF_SYNC_HANDLERS: Record<SelfSyncingJobKind, SelfSyncHandler> = {
  reelCover: {
    syncStatus: (job, status, outputUrl) => syncReelCoverJob(job, status, outputUrl),
    failClaimed: (job) => syncReelCoverJob(job, "failed"),
  },
  directorPreview: {
    syncStatus: (job, status, outputUrl) => syncDirectorPreviewJob(job, status, outputUrl),
    failClaimed: (job) => syncDirectorPreviewJob(job, "failed"),
  },
  product: {
    syncStatus: (job, status, outputUrl) => syncProductJob(job, status, outputUrl),
    failClaimed: async (job, error) => {
      if (job.productId) await failProduct(job.productId, error);
    },
  },
  postPreview: {
    syncStatus: (job, status, outputUrl) => syncPostPreviewJob(job, status, outputUrl),
    failClaimed: (job) => syncPostPreviewJob(job, "failed"),
  },
  stylePreview: {
    syncStatus: (job, status, outputUrl) => syncStylePreviewJob(job, status, outputUrl),
    failClaimed: (job) => syncStylePreviewJob(job, "failed"),
  },
  textStylePreview: {
    syncStatus: (job, status, outputUrl) => syncTextStylePreviewJob(job, status, outputUrl),
    failClaimed: (job) => syncTextStylePreviewJob(job, "failed"),
  },
  subtitlePlate: {
    syncStatus: (job, status, outputUrl, errorMessage) =>
      syncSubtitlePlateJob(job, status, outputUrl, errorMessage),
    failClaimed: (job, error) => syncSubtitlePlateJob(job, "failed", undefined, error),
  },
  onscreenText: {
    syncStatus: (job, status, outputUrl, errorMessage) =>
      syncOnscreenTextJob(job, status, outputUrl, errorMessage),
    failClaimed: (job, error) => syncOnscreenTextJob(job, "failed", undefined, error),
  },
  character: {
    syncStatus: (job, status, outputUrl) => syncCharacterJob(job, status, outputUrl),
    failClaimed: async (job, error) => {
      if (!job.characterId || !job.versionId) return;
      if (job.characterSlot === "profile") {
        await markCharacterProfileFailed(job.characterId, job.versionId);
        return;
      }
      await failCharacterVersion(job.characterId, job.versionId, error);
    },
  },
  poseEdit: {
    syncStatus: (job, status, outputUrl) => syncPoseEditJob(job, status, outputUrl),
    // Queue failures keep the short sentence. The provider's raw error stays off the document.
    failClaimed: (job) => {
      if (!job.poseEditId) return Promise.resolve();
      return failPoseEdit(job.poseEditId, POSE_EDIT_ERRORS.failed);
    },
  },
};

export async function dispatchSelfSyncingJobStatus(input: {
  job: GenerationJob & { kind: SelfSyncingJobKind };
  status: GenerationStatus;
  outputUrl?: string;
  errorMessage?: string;
}) {
  const handler = SELF_SYNC_HANDLERS[input.job.kind];
  await handler.syncStatus(
    input.job,
    input.status,
    input.outputUrl,
    input.errorMessage,
  );
}

export async function dispatchSelfSyncingJobFailure(
  job: GenerationJob & { kind: SelfSyncingJobKind },
  error: string,
) {
  const handler = SELF_SYNC_HANDLERS[job.kind];
  await handler.failClaimed(job, error);
}

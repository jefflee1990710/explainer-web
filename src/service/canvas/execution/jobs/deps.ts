// Canvas executor dependencies and small helpers shared by submit, dispatch, and poll.
// Callers keep importing the public types from "@/service/canvas/execution/executor".

import { ObjectId } from "mongodb";
import {
  canvasJobsCollection,
  canvasProjectsCollection,
  workerTasksCollection,
} from "@/dao";
import type { CanvasJob, CanvasNodeData, CanvasOutputKind, CanvasProject } from "@/model/canvas";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { consumeCreditUsd, refundCreditUsd } from "@/service/billing/credits";
import { createDefaultCanvasJobLedgerDeps, readUserCreditUsd } from "@/service/canvas/execution/job-ledger";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { getCanvasModelCatalog } from "@/service/canvas/catalog/model-catalog";
import {
  executeScroSyncNode,
  pollScroAsyncJob,
  submitScroAsyncNode,
} from "@/service/canvas/execution/scro-dispatch";
import { persistBuffer, persistMedia } from "@/service/higgsfield/persist";
import { scheduleCanvasNodeWorkerTask } from "@/service/worker/schedule";
import { enqueueWorkerTask } from "@/service/worker/task-queue";
import {
  type MentalokCreateJobPayload,
  type MentalokJobRecord,
  createMentalokJob,
  ensureMentalokUrl,
  getMentalokJob,
  hasMentalokApiKey,
} from "@/service/mentalok/client";
import {
  type OpenRouterCanvasVideoInput,
  fetchOpenRouterStatus,
  hasOpenRouterKey,
  submitOpenRouterCanvasVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { generateCanvasText, type CanvasTextResult } from "@/service/canvas/execution/canvas-text";
import { hasGoogleStudioKey, submitGoogleStudioImage } from "@/service/google/studio-image";
import {
  type MinimaxCanvasImageInput,
  type MinimaxCanvasVideoInput,
  fetchMinimaxCanvasVideo,
  submitMinimaxCanvasImage,
  submitMinimaxCanvasVideo,
} from "@/service/minimax/official-canvas";
import { minimaxApiKey } from "@/service/minimax/talking-head-reference";
import { fetchGoogleStudioVideo, submitGoogleStudioVideo } from "@/service/google/studio-video";
import {
  type ArgolinkCanvasVideoInput,
  fetchArgolinkCanvasVideo,
  hasArgolinkKey,
  submitArgolinkCanvasVideo,
} from "@/service/argolink/client";

export type CanvasExecutorDeps = {
  findCanvasProject: (
    canvasId: ObjectId,
    clerkUserId: string,
  ) => Promise<CanvasProject | null>;
  updateCanvasNodeState: (params: {
    canvasId: ObjectId;
    clerkUserId: string;
    nodeId: string;
    patch: Partial<CanvasNodeData>;
    thumbnailUrl?: string;
    updatedAt: Date;
  }) => Promise<void>;
  insertCanvasJob: (job: CanvasJob) => Promise<void>;
  updateCanvasJob: (
    jobId: ObjectId,
    clerkUserId: string,
    update: {
      $set?: Partial<CanvasJob>;
      $unset?: Partial<Record<keyof CanvasJob, "" | 1>>;
    },
  ) => Promise<void>;
  findCanvasJobsByIds: (
    canvasId: ObjectId,
    clerkUserId: string,
    jobIds: ObjectId[],
  ) => Promise<CanvasJob[]>;
  // Newest completed outputs for model nodes whose canvas document lost outputUrl.
  findCompletedJobOutputs: (
    canvasId: ObjectId,
    clerkUserId: string,
    nodeIds: string[],
  ) => Promise<CanvasJob[]>;
  claimCanvasJobRefund: (
    jobId: ObjectId,
    clerkUserId: string,
    refundedAt: Date,
  ) => Promise<CanvasJob | null>;
  getCatalog: () => Promise<CanvasModelSpec[]>;
  hasMentalokKey: () => boolean;
  hasOpenRouterKey: () => boolean;
  hasMinimaxKey: () => boolean;
  hasGoogleStudioKey: () => boolean;
  hasArgolinkKey: () => boolean;
  consumeCreditUsd: (clerkUserId: string, costUsd: number) => Promise<string>;
  refundCreditUsd: (
    clerkUserId: string,
    costUsd: number,
    spendEventKey?: string,
  ) => Promise<void>;
  getUserCreditUsd: (clerkUserId: string) => Promise<number>;
  submitOpenRouterImage: (input: {
    model: string;
    prompt: string;
    aspectRatio: AspectRatio | "2:3" | "3:4";
    quality?: "low" | "medium" | "high";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  }) => Promise<GenerationSubmitResult>;
  submitGoogleStudioImage: (input: {
    model: string;
    prompt: string;
    aspectRatio: AspectRatio | "2:3" | "3:4";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  }) => Promise<GenerationSubmitResult>;
  submitGoogleStudioVideo: (input: {
    model: string;
    prompt?: string;
    aspectRatio?: string;
    durationSeconds?: number;
    startImageUrl?: string;
    endImageUrl?: string;
    referenceImageUrls?: Array<string | undefined>;
  }) => Promise<GenerationSubmitResult>;
  fetchGoogleStudioVideo: (interactionId: string) => Promise<GenerationSubmitResult>;
  submitOpenRouterCanvasVideo: (
    input: OpenRouterCanvasVideoInput,
  ) => Promise<GenerationSubmitResult>;
  fetchOpenRouterStatus: (statusUrl: string) => Promise<GenerationSubmitResult>;
  submitMinimaxCanvasImage: (input: MinimaxCanvasImageInput) => Promise<GenerationSubmitResult>;
  submitMinimaxCanvasVideo: (input: MinimaxCanvasVideoInput) => Promise<GenerationSubmitResult>;
  fetchMinimaxCanvasVideo: (statusUrl: string) => Promise<GenerationSubmitResult>;
  submitArgolinkCanvasVideo: (input: ArgolinkCanvasVideoInput) => Promise<GenerationSubmitResult>;
  fetchArgolinkCanvasVideo: (statusUrl: string) => Promise<GenerationSubmitResult>;
  createMentalokJob: (payload: MentalokCreateJobPayload) => Promise<MentalokJobRecord>;
  getMentalokJob: (jobId: string) => Promise<MentalokJobRecord>;
  ensureMentalokUrl: (mediaUrl: string) => Promise<string>;
  persistMedia: (url: string, pathname: string) => Promise<string>;
  // Chat completion for a text-model node. Tests pass a fake so no API key is used.
  generateCanvasText: (input: { model: string; prompt: string }) => Promise<CanvasTextResult>;
  // Stores the generated text and returns its public URL.
  persistText: (text: string, pathname: string) => Promise<string>;
  executeScroSyncNode: typeof executeScroSyncNode;
  submitScroAsyncNode: typeof submitScroAsyncNode;
  pollScroAsyncJob: typeof pollScroAsyncJob;
  enqueueFfmpegWorkerTask: (params: {
    jobIdHex: string;
    modelId: string;
    clerkUserId: string;
  }) => Promise<ObjectId>;
  findWorkerTaskStatus: (
    workerTaskId: string,
  ) => Promise<{ status: string; error?: string } | null>;
  findCanvasJobById?: (jobId: ObjectId) => Promise<CanvasJob | null>;
  enqueueCanvasNodeWorkerTask?: (jobId: ObjectId) => Promise<void> | void;
  probeAudioDurationSec?: (audioUrl: string) => Promise<number | null>;
  now: () => Date;
};

export type SubmitCanvasNodeJobInput = {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  queueToWorker?: boolean;
  // Fused chain: these upstream nodes are rendered earlier in the same job (inputs become fused:// refs).
  fusedUpstream?: string[];
  fusedIntoJobId?: string;
  // Create the queued job but start no worker; the fused chain starts its head itself.
  deferWorker?: boolean;
};

export type SubmitCanvasNodeJobErrorCode =
  | "NOT_FOUND"
  | "INVALID_NODE"
  | "INVALID_MODEL"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_INPUTS"
  | "INSUFFICIENT_CREDIT"
  | "PROVIDER_ERROR";

export type SubmitCanvasNodeJobResult =
  | {
      ok: true;
      job: CanvasJob;
      creditUsd: number;
    }
  | {
      ok: false;
      code: SubmitCanvasNodeJobErrorCode;
      error: string;
      creditUsd?: number;
      requiredUsd?: number;
      availableUsd?: number;
      missingRequiredFields?: string[];
      missingUpstreamNodeIds?: string[];
      job?: CanvasJob;
    };

export type PollCanvasJobsInput = {
  clerkUserId: string;
  canvasId: string;
  jobIds: string[];
};

export type PollCanvasJobsResult = {
  jobs: CanvasJob[];
  creditUsd: number;
};

function createDefaultDeps(): CanvasExecutorDeps {
  const defaultLedger = createDefaultCanvasJobLedgerDeps();
  return {
    findCanvasProject: async (canvasId, clerkUserId) => {
      const projects = await canvasProjectsCollection();
      return projects.findOne({ _id: canvasId, clerkUserId });
    },
    updateCanvasNodeState: defaultLedger.updateCanvasNodeState,
    insertCanvasJob: defaultLedger.insertCanvasJob,
    updateCanvasJob: defaultLedger.updateCanvasJob,
    findCanvasJobsByIds: async (canvasId, clerkUserId, jobIds) => {
      if (jobIds.length === 0) return [];
      const jobs = await canvasJobsCollection();
      return jobs
        .find({ _id: { $in: jobIds }, canvasId, clerkUserId })
        .toArray();
    },
    findCompletedJobOutputs: async (canvasId, clerkUserId, nodeIds) => {
      if (nodeIds.length === 0) return [];
      const jobs = await canvasJobsCollection();
      return jobs
        .find({
          canvasId,
          clerkUserId,
          nodeId: { $in: nodeIds },
          status: "completed",
          outputUrl: { $exists: true, $ne: "" },
        })
        .sort({ updatedAt: -1 })
        .toArray();
    },
    claimCanvasJobRefund: defaultLedger.claimCanvasJobRefund,
    getCatalog: () => getCanvasModelCatalog(),
    hasMentalokKey: () => hasMentalokApiKey(),
    hasOpenRouterKey: () => hasOpenRouterKey(),
    hasMinimaxKey: () => Boolean(minimaxApiKey()),
    hasGoogleStudioKey: () => hasGoogleStudioKey(),
    hasArgolinkKey: () => hasArgolinkKey(),
    consumeCreditUsd,
    refundCreditUsd,
    getUserCreditUsd: readUserCreditUsd,
    submitOpenRouterImage: (input) => submitOpenRouterImage(input),
    submitGoogleStudioImage: (input) => submitGoogleStudioImage(input),
    submitGoogleStudioVideo: (input) => submitGoogleStudioVideo(input),
    fetchGoogleStudioVideo: (interactionId) => fetchGoogleStudioVideo(interactionId),
    submitOpenRouterCanvasVideo: (input) => submitOpenRouterCanvasVideo(input),
    fetchOpenRouterStatus: (statusUrl) => fetchOpenRouterStatus(statusUrl),
    submitMinimaxCanvasImage: (input) => submitMinimaxCanvasImage(input),
    submitMinimaxCanvasVideo: (input) => submitMinimaxCanvasVideo(input),
    fetchMinimaxCanvasVideo: (statusUrl) => fetchMinimaxCanvasVideo(statusUrl),
    submitArgolinkCanvasVideo: (input) => submitArgolinkCanvasVideo(input),
    fetchArgolinkCanvasVideo: (statusUrl) => fetchArgolinkCanvasVideo(statusUrl),
    createMentalokJob: (payload) => createMentalokJob(payload),
    getMentalokJob: (jobId) => getMentalokJob(jobId),
    ensureMentalokUrl: (mediaUrl) => ensureMentalokUrl(mediaUrl),
    persistMedia: (url, pathname) => persistMedia(url, pathname),
    generateCanvasText: (input) => generateCanvasText(input),
    persistText: (text, pathname) =>
      persistBuffer(Buffer.from(text, "utf8"), pathname, "text/plain; charset=utf-8"),
    executeScroSyncNode: (params) => executeScroSyncNode(params),
    submitScroAsyncNode: (params) => submitScroAsyncNode(params),
    pollScroAsyncJob: (params) => pollScroAsyncJob(params),
    enqueueFfmpegWorkerTask: async ({ jobIdHex, modelId, clerkUserId }) =>
      enqueueWorkerTask({
        kind: "canvas_ffmpeg",
        targetId: jobIdHex,
        lane: "cpu",
        payload: { modelId, clerkUserId },
      }),
    findWorkerTaskStatus: async (workerTaskId) => {
      if (!ObjectId.isValid(workerTaskId)) return null;
      const col = await workerTasksCollection();
      const doc = await col.findOne({ _id: new ObjectId(workerTaskId) });
      if (!doc) return null;
      return { status: doc.status, error: doc.error };
    },
    findCanvasJobById: async (jobId) => {
      const col = await canvasJobsCollection();
      return col.findOne({ _id: jobId });
    },
    enqueueCanvasNodeWorkerTask: (jobId) => scheduleCanvasNodeWorkerTask(jobId),
    probeAudioDurationSec: async (audioUrl) => {
      try {
        const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = audioUrl.toLowerCase().includes(".wav")
          ? "wav"
          : audioUrl.toLowerCase().includes(".ogg")
            ? "ogg"
            : audioUrl.toLowerCase().includes(".m4a")
              ? "m4a"
              : "mp3";
        const { probeAudioSeconds } = await import("@/service/voice/voice-swap");
        return await probeAudioSeconds(buf, ext);
      } catch {
        return null;
      }
    },
    now: () => new Date(),
  };
}

export function resolveDeps(overrides?: Partial<CanvasExecutorDeps>): CanvasExecutorDeps {
  const defaults = createDefaultDeps();
  return overrides ? { ...defaults, ...overrides } : defaults;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

export function isInsufficientCreditError(error: unknown): boolean {
  const msg = toErrorMessage(error, "");
  return /餘額不足|insufficient|not enough credit|credit.*low|請先訂閱/i.test(msg);
}

// Infers a deterministic Blob pathname for a completed canvas job output so
// retries overwrite the same key cleanly without leaking orphaned files.
export function buildCanvasBlobPathname(
  clerkUserId: string,
  jobIdHex: string,
  outputKind: CanvasOutputKind,
  sourceUrl: string,
): string {
  const lower = sourceUrl.toLowerCase();
  if (outputKind === "video") {
    const ext = lower.includes(".webm") ? "webm" : "mp4";
    return `canvas/${clerkUserId}/${jobIdHex}.${ext}`;
  }
  if (outputKind === "audio") {
    return `canvas/${clerkUserId}/${jobIdHex}.mp3`;
  }
  if (lower.startsWith("data:image/webp") || /\.webp(?:$|\?)/.test(lower)) {
    return `canvas/${clerkUserId}/${jobIdHex}.webp`;
  }
  if (
    lower.startsWith("data:image/jpeg") ||
    lower.startsWith("data:image/jpg") ||
    /\.jpe?g(?:$|\?)/.test(lower)
  ) {
    return `canvas/${clerkUserId}/${jobIdHex}.jpg`;
  }
  return `canvas/${clerkUserId}/${jobIdHex}.png`;
}

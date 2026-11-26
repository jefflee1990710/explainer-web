// Execution engine, async polling, permanent Vercel Blob persistence, and
// idempotent USD credit refunds for the Interactive Node Canvas Editor (/app/canvas).

import { ObjectId } from "mongodb";
import {
  canvasJobsCollection,
  canvasProjectsCollection,
  usersCollection,
  workerTasksCollection,
} from "@/dao";
import type {
  CanvasJob,
  CanvasNode,
  CanvasNodeData,
  CanvasOutputKind,
  CanvasProject,
} from "@/model/canvas";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { consumeCreditUsd, refundCreditUsd } from "@/service/billing/credits";
import { withUnlimitedCredits } from "@/service/billing/unlimited-credits";
import {
  type RefundCanvasJobResult,
  createDefaultCanvasJobLedgerDeps,
  markJobCompleted,
  markJobFailed,
  markJobQueued,
  markJobRunning,
  refundCanvasJobOnce,
} from "@/service/canvas/job-ledger";
import {
  type ResolvedCanvasInputs,
  applyCompletedJobOutputs,
  resolveNodeInputs,
} from "@/service/canvas/graph";
import { isExplainerPlannerNode } from "@/service/canvas/explainer-planner";
import { isScroDirectorNode } from "@/service/canvas/scro-director";
import {
  type CanvasModelSpec,
  findCanvasModel,
  getCanvasModelCatalog,
} from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import {
  executeScroSyncNode,
  pollScroAsyncJob,
  submitScroAsyncNode,
  validateScroToolInputs,
} from "@/service/canvas/scro-dispatch";
import { persistMedia } from "@/service/higgsfield/persist";
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
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
  OPENROUTER_VIDEOS_URL,
  type OpenRouterCanvasVideoInput,
  fetchOpenRouterStatus,
  hasOpenRouterKey,
  submitOpenRouterCanvasVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
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
import { normalizeCaptionLanguage } from "@/service/canvas/captions";
import { probeRemoteDurationSec, transcribeCaptionVideo } from "@/service/canvas/caption-transcribe";
import { isElevenLabsConfigured } from "@/service/voice/elevenlabs";

// Mentalok video models that accept a `keyframes` object (`startImage` / `endImage`).
// Single-frame TI2V models (`wan-2-1`, `wan-2-2`, `ltx-video`) receive `imageUrl` instead.
const MENTALOK_KEYFRAME_MODELS = new Set(["minimax-h3-ref2va", "ltx-2-5"]);

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
  createMentalokJob: (payload: MentalokCreateJobPayload) => Promise<MentalokJobRecord>;
  getMentalokJob: (jobId: string) => Promise<MentalokJobRecord>;
  ensureMentalokUrl: (mediaUrl: string) => Promise<string>;
  persistMedia: (url: string, pathname: string) => Promise<string>;
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

export { refundCanvasJobOnce };
export type { RefundCanvasJobResult };

async function defaultGetUserCreditUsd(clerkUserId: string): Promise<number> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId });
  if (!user) return 0;
  return resolveUserUsdBalance(withUnlimitedCredits(user)).creditUsd;
}

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
    consumeCreditUsd,
    refundCreditUsd,
    getUserCreditUsd: defaultGetUserCreditUsd,
    submitOpenRouterImage: (input) => submitOpenRouterImage(input),
    submitGoogleStudioImage: (input) => submitGoogleStudioImage(input),
    submitGoogleStudioVideo: (input) => submitGoogleStudioVideo(input),
    fetchGoogleStudioVideo: (interactionId) => fetchGoogleStudioVideo(interactionId),
    submitOpenRouterCanvasVideo: (input) => submitOpenRouterCanvasVideo(input),
    fetchOpenRouterStatus: (statusUrl) => fetchOpenRouterStatus(statusUrl),
    submitMinimaxCanvasImage: (input) => submitMinimaxCanvasImage(input),
    submitMinimaxCanvasVideo: (input) => submitMinimaxCanvasVideo(input),
    fetchMinimaxCanvasVideo: (statusUrl) => fetchMinimaxCanvasVideo(statusUrl),
    createMentalokJob: (payload) => createMentalokJob(payload),
    getMentalokJob: (jobId) => getMentalokJob(jobId),
    ensureMentalokUrl: (mediaUrl) => ensureMentalokUrl(mediaUrl),
    persistMedia: (url, pathname) => persistMedia(url, pathname),
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

function resolveDeps(overrides?: Partial<CanvasExecutorDeps>): CanvasExecutorDeps {
  const defaults = createDefaultDeps();
  return overrides ? { ...defaults, ...overrides } : defaults;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

function isInsufficientCreditError(error: unknown): boolean {
  const msg = toErrorMessage(error, "");
  return /餘額不足|insufficient|not enough credit|credit.*low|請先訂閱/i.test(msg);
}

function normalizeOpenRouterImageAspectRatio(
  raw?: string,
): AspectRatio | "2:3" | "3:4" {
  if (raw === "9:16" || raw === "1:1" || raw === "2:3" || raw === "3:4") {
    return raw;
  }
  return "16:9";
}

function normalizeOpenRouterVideoAspectRatio(raw?: string): AspectRatio {
  if (raw === "9:16" || raw === "3:4") return "9:16";
  if (raw === "1:1") return "1:1";
  return "16:9";
}

// Infers a deterministic Blob pathname for a completed canvas job output so
// retries overwrite the same key cleanly without leaking orphaned files.
function buildCanvasBlobPathname(
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

// Maps resolved Canvas inputs to a Mentalok AI Studio POST /api/v1/jobs payload,
// bridging any data: or non-HTTPS URLs through POST /api/v1/uploads.
async function buildMentalokJobPayload(
  spec: CanvasModelSpec,
  node: CanvasNode,
  inputs: ResolvedCanvasInputs,
  presetId: string,
  ensureUrl: (mediaUrl: string) => Promise<string>,
): Promise<MentalokCreateJobPayload> {
  const payload: MentalokCreateJobPayload = {
    modelId: spec.providerModelId,
    presetId,
  };

  if (inputs.prompt) {
    payload.prompt = inputs.prompt;
  }
  const negativePrompt = node.data.negativePrompt?.trim();
  if (negativePrompt) {
    payload.negativePrompt = negativePrompt;
  }
  if (typeof node.data.seed === "number" && Number.isFinite(node.data.seed)) {
    payload.seed = Math.trunc(node.data.seed);
  }

  if (inputs.image) {
    payload.imageUrl = await ensureUrl(inputs.image);
  }
  if (inputs.video) {
    payload.videoUrl = await ensureUrl(inputs.video);
  }
  if (inputs.refAudio) {
    payload.refAudioUrl = await ensureUrl(inputs.refAudio);
  }
  if (inputs.refImages.length > 0) {
    payload.refImages = await Promise.all(
      inputs.refImages.map((url) => ensureUrl(url)),
    );
  }

  if (inputs.startImage || inputs.endImage) {
    const startImage = inputs.startImage
      ? await ensureUrl(inputs.startImage)
      : undefined;
    const endImage = inputs.endImage ? await ensureUrl(inputs.endImage) : undefined;

    if (MENTALOK_KEYFRAME_MODELS.has(spec.providerModelId)) {
      payload.keyframes = {
        ...(startImage ? { startImage } : {}),
        ...(endImage ? { endImage } : {}),
      };
    } else if (startImage && !payload.imageUrl) {
      // Single-frame TI2V models (`wan-2-1`, `wan-2-2`, `ltx-video`) take `imageUrl`.
      payload.imageUrl = startImage;
    }
  }

  return payload;
}

// Restores outputUrl from the newest completed job when a stale graph save wiped it.
async function hydrateMissingModelOutputs(
  project: CanvasProject,
  deps: CanvasExecutorDeps,
): Promise<CanvasNode[]> {
  const missingNodeIds = project.nodes
    .filter((item) => item.type === "model" && !item.data.outputUrl?.trim())
    .map((item) => item.id);
  if (missingNodeIds.length === 0) return project.nodes;

  const jobs = await deps.findCompletedJobOutputs(
    project._id,
    project.clerkUserId,
    missingNodeIds,
  );
  const hydrated = applyCompletedJobOutputs(project.nodes, jobs);
  const now = deps.now();
  for (const item of hydrated) {
    if (item.type !== "model" || !item.data.outputUrl) continue;
    const previous = project.nodes.find((node) => node.id === item.id);
    if (!previous || previous.data.outputUrl?.trim()) continue;
    await deps.updateCanvasNodeState({
      canvasId: project._id,
      clerkUserId: project.clerkUserId,
      nodeId: item.id,
      patch: {
        outputUrl: item.data.outputUrl,
        ...(item.data.outputKind ? { outputKind: item.data.outputKind } : {}),
        status: "completed",
        lastError: undefined,
      },
      updatedAt: now,
    });
  }
  return hydrated;
}

// Validates a model node, pre-charges authoritative USD credit, creates a `canvas_jobs`
// record, dispatches to OpenRouter or Mentalok, and auto-refunds on any submit error.
export async function submitCanvasNodeJob(
  input: SubmitCanvasNodeJobInput,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<SubmitCanvasNodeJobResult> {
  const resolved = resolveDeps(deps);

  if (!ObjectId.isValid(input.canvasId)) {
    return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
  }
  const canvasObjectId = new ObjectId(input.canvasId);
  const loadedProject = await resolved.findCanvasProject(
    canvasObjectId,
    input.clerkUserId,
  );
  if (!loadedProject) {
    return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
  }
  const project = loadedProject;

  const node = project.nodes.find((item) => item.id === input.nodeId);
  if (!node || node.type !== "model") {
    return {
      ok: false,
      code: "INVALID_NODE",
      error: "找不到可執行的模型節點",
    };
  }

  const catalog = await resolved.getCatalog();
  const spec = node.data.modelId
    ? findCanvasModel(node.data.modelId, catalog)
    : undefined;
  if (!spec) {
    return {
      ok: false,
      code: "INVALID_MODEL",
      error: `不支援的模型：${node.data.modelId || "(未選擇)"}`,
    };
  }

  if (isExplainerPlannerNode(node) || isScroDirectorNode(node)) {
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: isScroDirectorNode(node)
        ? "先按建立展開換角或換場，再執行展開後的節點"
        : "解說分鏡規劃完成後會展開成節點，請執行展開後的節點",
    };
  }

  // Verify provider credentials before charging any USD credit.
  if (spec.provider === "mentalok" && !resolved.hasMentalokKey()) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error:
        "Mentalok AI Studio 尚未設定 API Key（MENTALOK_AI_STUDIO_API_KEY），暫時無法執行此模型。",
      creditUsd,
    };
  }
  if (spec.provider === "openrouter" && !resolved.hasOpenRouterKey()) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error:
        "OpenRouter 尚未設定 API Key（OPENROUTER_API_KEY），暫時無法執行此模型。",
      creditUsd,
    };
  }
  if (spec.provider === "minimax" && !resolved.hasMinimaxKey()) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error: "MiniMax 尚未設定 API Key（MINIMAX_API_KEY），暫時無法執行此模型。",
      creditUsd,
    };
  }
  if (spec.id === "scro:auto-captions" && !isElevenLabsConfigured()) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error: "ElevenLabs 尚未設定 API Key（ELEVENLABS_API_KEY），暫時無法偵測字幕。",
      creditUsd,
    };
  }
  if (spec.provider === "google" && !resolved.hasGoogleStudioKey()) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      error:
        "Google AI Studio 尚未設定 API Key（GOOGLE_GENERATIVE_AI_API_KEY），暫時無法執行此模型。",
      creditUsd,
    };
  }

  const projectNodes = await hydrateMissingModelOutputs(project, resolved);
  const inputCheck = resolveNodeInputs(
    node.id,
    projectNodes,
    project.edges,
    catalog,
  );
  if (!inputCheck.ok) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    const details: string[] = [];
    if (inputCheck.missingRequiredFields.length > 0) {
      details.push(`缺少必要輸入：${inputCheck.missingRequiredFields.join(", ")}`);
    }
    if (inputCheck.missingUpstreamNodeIds.length > 0) {
      details.push("上游節點尚未產生輸出");
    }
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: details.join("；") || inputCheck.reason || "節點輸入不完整",
      missingRequiredFields: inputCheck.missingRequiredFields,
      missingUpstreamNodeIds: inputCheck.missingUpstreamNodeIds,
      creditUsd,
    };
  }

  if (spec.provider === "scro") {
    const scroCheck = validateScroToolInputs(spec.id, node, inputCheck.inputs);
    if (!scroCheck.ok) {
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: false,
        code: "INVALID_INPUTS",
        error: scroCheck.reason,
        missingRequiredFields: scroCheck.missingRequiredFields,
        creditUsd,
      };
    }
  }

  // Recalculate authoritative USD cost server-side before deducting wallet balance.
  const durationPresetSec =
    node.data.toolParams?.durationPreset === "15s"
      ? 15
      : node.data.toolParams?.durationPreset === "30s"
        ? 30
        : node.data.toolParams?.durationPreset === "45s"
          ? 45
          : node.data.toolParams?.durationPreset === "60s"
            ? 60
            : undefined;

  let resolvedDurationSeconds =
    spec.id === "scro:explainer"
      ? durationPresetSec ?? node.data.durationSeconds
      : node.data.durationSeconds ?? durationPresetSec;

  const isHeyGen = spec.providerModelId === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL;
  if (spec.id === "scro:talking-head" || isHeyGen) {
    if (inputCheck.inputs.refAudio && resolved.probeAudioDurationSec) {
      const probed = await resolved.probeAudioDurationSec(inputCheck.inputs.refAudio);
      if (probed && Number.isFinite(probed) && probed > 0) {
        resolvedDurationSeconds = Math.min(120, Math.max(5, Math.ceil(probed)));
      }
    } else if (
      !isHeyGen &&
      resolvedDurationSeconds === undefined &&
      inputCheck.inputs.prompt?.trim()
    ) {
      const text = inputCheck.inputs.prompt.trim();
      const cjkChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
      const latinWords = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
      const estimated = Math.ceil(cjkChars / 4 + latinWords / 2.5);
      resolvedDurationSeconds = Math.min(120, Math.max(5, estimated));
    }
  }

  if (
    spec.provider === "google" &&
    spec.category === "video" &&
    inputCheck.inputs.startImage &&
    inputCheck.inputs.endImage
  ) {
    // Omni interpolates two frames for at most 10 seconds.
    resolvedDurationSeconds = Math.min(resolvedDurationSeconds ?? 10, 10);
  }

  if (spec.id === "scro:auto-captions" && inputCheck.inputs.video) {
    const probed = await probeRemoteDurationSec(inputCheck.inputs.video).catch(() => null);
    // A failed probe still bills a short clip so the run is not free.
    resolvedDurationSeconds = probed && probed > 0 ? probed : resolvedDurationSeconds ?? 10;
  }

  const costUsd = estimateCanvasModelCostUsd(spec, {
    durationSeconds: resolvedDurationSeconds,
    resolution: node.data.resolution,
    referenceImages: inputCheck.inputs.refImages?.length,
  });

  let spendEventKey: string | undefined;
  if (costUsd > 0) {
    try {
      spendEventKey = await resolved.consumeCreditUsd(input.clerkUserId, costUsd);
    } catch (error) {
      const availableUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      if (isInsufficientCreditError(error)) {
        return {
          ok: false,
          code: "INSUFFICIENT_CREDIT",
          error: toErrorMessage(error, "USD Credit 餘額不足，無法執行此節點"),
          requiredUsd: costUsd,
          availableUsd,
          creditUsd: availableUsd,
        };
      }
      throw error;
    }
  }

  const jobId = new ObjectId();
  const now = resolved.now();
  const presetId =
    spec.provider === "mentalok" || spec.provider === "ffmpeg"
      ? node.data.presetId && spec.presets.includes(node.data.presetId)
        ? node.data.presetId
        : spec.defaultPresetId
      : node.data.aspectRatio || node.data.presetId || spec.defaultPresetId;

  const inputSnapshot: Record<string, unknown> = {
    ...(inputCheck.inputs.prompt ? { prompt: inputCheck.inputs.prompt } : {}),
    ...(node.data.negativePrompt?.trim()
      ? { negativePrompt: node.data.negativePrompt.trim() }
      : {}),
    ...(typeof node.data.seed === "number" ? { seed: node.data.seed } : {}),
    ...(node.data.aspectRatio ? { aspectRatio: node.data.aspectRatio } : {}),
    ...(node.data.resolution ? { resolution: node.data.resolution } : {}),
    ...(resolvedDurationSeconds !== undefined
      ? { durationSeconds: resolvedDurationSeconds }
      : {}),
    ...(node.data.toolParams ? { toolParams: node.data.toolParams } : {}),
    ...(inputCheck.inputs.image ? { image: inputCheck.inputs.image } : {}),
    ...(inputCheck.inputs.startImage
      ? { startImage: inputCheck.inputs.startImage }
      : {}),
    ...(inputCheck.inputs.endImage
      ? { endImage: inputCheck.inputs.endImage }
      : {}),
    ...(inputCheck.inputs.refImages.length > 0
      ? { refImages: inputCheck.inputs.refImages }
      : {}),
    ...(inputCheck.inputs.video ? { video: inputCheck.inputs.video } : {}),
    ...(inputCheck.inputs.videos.length > 0
      ? { videos: inputCheck.inputs.videos }
      : {}),
    ...(inputCheck.inputs.refAudio
      ? { refAudio: inputCheck.inputs.refAudio }
      : {}),
    ...(inputCheck.inputs.overlayVideo
      ? { overlayVideo: inputCheck.inputs.overlayVideo }
      : {}),
    presetId,
  };

  const initialJob: CanvasJob = {
    _id: jobId,
    clerkUserId: input.clerkUserId,
    canvasId: canvasObjectId,
    nodeId: node.id,
    ...(input.flowRunId ? { flowRunId: input.flowRunId } : {}),
    provider: spec.provider,
    modelId: spec.id,
    providerModelId: spec.providerModelId,
    presetId,
    status: "queued",
    inputSnapshot,
    chargedUsd: costUsd,
    ...(spendEventKey ? { spendEventKey } : {}),
    outputKind: spec.output.type,
    createdAt: now,
    updatedAt: now,
  };

  await markJobQueued(initialJob, resolved);

  if (input.queueToWorker) {
    await resolved.enqueueCanvasNodeWorkerTask?.(jobId);
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { ok: true, job: initialJob, creditUsd };
  }

  return executeDispatchedCanvasJob(
    {
      initialJob,
      spec,
      // Same as the worker path: submit the length that was priced.
      node:
        resolvedDurationSeconds !== undefined
          ? { ...node, data: { ...node.data, durationSeconds: resolvedDurationSeconds } }
          : node,
      inputs: inputCheck.inputs,
      presetId,
    },
    resolved,
  );
}

function inputsFromSnapshot(snapshot: Record<string, unknown>): ResolvedCanvasInputs {
  return {
    prompt: typeof snapshot.prompt === "string" ? snapshot.prompt : undefined,
    image: typeof snapshot.image === "string" ? snapshot.image : undefined,
    startImage: typeof snapshot.startImage === "string" ? snapshot.startImage : undefined,
    endImage: typeof snapshot.endImage === "string" ? snapshot.endImage : undefined,
    refImages: Array.isArray(snapshot.refImages) ? snapshot.refImages.map(String) : [],
    video: typeof snapshot.video === "string" ? snapshot.video : undefined,
    videos: Array.isArray(snapshot.videos) ? snapshot.videos.map(String) : [],
    refAudio: typeof snapshot.refAudio === "string" ? snapshot.refAudio : undefined,
    overlayVideo: typeof snapshot.overlayVideo === "string" ? snapshot.overlayVideo : undefined,
  };
}

export async function dispatchQueuedCanvasJobById(
  jobId: ObjectId,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<CanvasJob | null> {
  const resolved = resolveDeps(deps);
  const job = resolved.findCanvasJobById
    ? await resolved.findCanvasJobById(jobId)
    : await (await canvasJobsCollection()).findOne({ _id: jobId });
  if (!job || job.status !== "queued") return job;

  const project = await resolved.findCanvasProject(job.canvasId, job.clerkUserId);
  const node = project?.nodes.find((n) => n.id === job.nodeId);
  const catalog = await resolved.getCatalog();
  const spec = findCanvasModel(job.modelId, catalog);
  if (!project || !node || !spec) {
    return settleFailedJob(job, "找不到畫布節點或模型規格", resolved);
  }

  const snapshot = job.inputSnapshot ?? {};
  const snapshotDuration =
    typeof snapshot.durationSeconds === "number" && Number.isFinite(snapshot.durationSeconds)
      ? snapshot.durationSeconds
      : undefined;
  const effectiveNode =
    snapshotDuration !== undefined
      ? { ...node, data: { ...node.data, durationSeconds: snapshotDuration } }
      : node;

  const res = await executeDispatchedCanvasJob(
    {
      initialJob: job,
      spec,
      node: effectiveNode,
      inputs: inputsFromSnapshot(snapshot),
      presetId: job.presetId || spec.defaultPresetId,
    },
    resolved,
  );
  return res.job ?? null;
}

// Persist a provider video that finished in the submit response, or leave it running for polling.
async function settleSubmittedVideo(input: {
  response: GenerationSubmitResult;
  initialJob: CanvasJob;
  clerkUserId: string;
  jobIdHex: string;
  resolved: CanvasExecutorDeps;
}): Promise<SubmitCanvasNodeJobResult> {
  const { response, initialJob, clerkUserId, jobIdHex, resolved } = input;
  if (response.status === "completed" && response.video?.url) {
    const blobPath = buildCanvasBlobPathname(clerkUserId, jobIdHex, "video", response.video.url);
    const permanentUrl = await resolved.persistMedia(response.video.url, blobPath);
    const completedJob = await markJobCompleted(
      initialJob,
      {
        outputUrl: permanentUrl,
        outputKind: "video",
        externalJobId: response.request_id,
        statusUrl: response.status_url,
      },
      resolved,
    );
    const creditUsd = await resolved.getUserCreditUsd(clerkUserId);
    return {
      ok: true,
      job: completedJob,
      creditUsd,
    };
  }

  const runningJob = await markJobRunning(
    initialJob,
    {
      externalJobId: response.request_id,
      statusUrl: response.status_url,
    },
    resolved,
  );
  const creditUsd = await resolved.getUserCreditUsd(clerkUserId);
  return {
    ok: true,
    job: runningJob,
    creditUsd,
  };
}

async function executeDispatchedCanvasJob(
  ctx: {
    initialJob: CanvasJob;
    spec: CanvasModelSpec;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
    presetId: string;
  },
  resolved: CanvasExecutorDeps,
): Promise<SubmitCanvasNodeJobResult> {
  const { initialJob, spec, node, inputs, presetId } = ctx;
  const jobId = initialJob._id;
  const jobIdHex = jobId.toHexString();
  const canvasObjectId = initialJob.canvasId;
  const clerkUserId = initialJob.clerkUserId;
  const input = {
    clerkUserId,
    canvasId: canvasObjectId.toHexString(),
  };
  const inputCheck = { inputs };

  try {
    // Branch 1: Synchronous OpenRouter / Google AI Studio image generation -> persist directly to Blob.
    if (
      (spec.provider === "openrouter" || spec.provider === "google" || spec.provider === "minimax") &&
      spec.category === "image"
    ) {
      const imageInput = {
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt || "",
        aspectRatio: normalizeOpenRouterImageAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        resolution: node.data.resolution,
        referenceImageUrls: inputCheck.inputs.refImages,
      };
      const response =
        spec.provider === "google"
          ? await resolved.submitGoogleStudioImage(imageInput)
          : spec.provider === "minimax"
            ? await resolved.submitMinimaxCanvasImage(imageInput)
            : await resolved.submitOpenRouterImage(imageInput);

      const rawOutputUrl = response.images?.[0]?.url;
      if (response.status === "nsfw" || response.status === "failed" || !rawOutputUrl) {
        const fallback =
          spec.provider === "google"
            ? "Google AI Studio 圖片生成失敗"
            : spec.provider === "minimax"
              ? "MiniMax 圖片生成失敗"
              : "OpenRouter 圖片生成失敗";
        throw new Error(response.error || fallback);
      }

      const blobPath = buildCanvasBlobPathname(
        input.clerkUserId,
        jobIdHex,
        "image",
        rawOutputUrl,
      );
      const permanentUrl = await resolved.persistMedia(rawOutputUrl, blobPath);
      const completedJob = await markJobCompleted(
        initialJob,
        {
          outputUrl: permanentUrl,
          outputKind: "image",
          externalJobId: response.request_id,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return { ok: true, job: completedJob, creditUsd };
    }

    // Branch 2: Google AI Studio Omni video. Create returns quickly; polling reads the interaction.
    if (spec.provider === "google" && spec.category === "video") {
      const response = await resolved.submitGoogleStudioVideo({
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt,
        aspectRatio: node.data.aspectRatio ?? node.data.presetId,
        durationSeconds: node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 10,
        startImageUrl: inputCheck.inputs.startImage,
        endImageUrl: inputCheck.inputs.endImage,
        referenceImageUrls: inputCheck.inputs.refImages,
      });
      if (response.status === "failed" || response.status === "nsfw") {
        throw new Error(response.error || "Google AI Studio 影片生成失敗");
      }
      return settleSubmittedVideo({
        response,
        initialJob,
        clerkUserId: input.clerkUserId,
        jobIdHex,
        resolved,
      });
    }

    // Branch 3: Asynchronous video. MiniMax uses the official API; other models stay on OpenRouter.
    if (spec.provider === "openrouter" || spec.provider === "minimax") {
      const videoInput = {
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt,
        aspectRatio: normalizeOpenRouterVideoAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        durationSeconds:
          node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 5,
        resolution: node.data.resolution,
        startImageUrl: inputCheck.inputs.startImage,
        endImageUrl: inputCheck.inputs.endImage,
        referenceImageUrls: inputCheck.inputs.refImages,
        audioUrl: inputCheck.inputs.refAudio,
        videoUrl: inputCheck.inputs.video,
      };
      const response = spec.provider === "minimax"
        ? await resolved.submitMinimaxCanvasVideo(videoInput)
        : await resolved.submitOpenRouterCanvasVideo(videoInput);

      if (response.status === "failed" || response.status === "nsfw") {
        throw new Error(
          response.error ||
            (spec.provider === "minimax" ? "MiniMax 影片生成失敗" : "OpenRouter 影片生成失敗"),
        );
      }

      return settleSubmittedVideo({
        response,
        initialJob,
        clerkUserId: input.clerkUserId,
        jobIdHex,
        resolved,
      });
    }

    // Branch 4: Vast.ai Worker FFmpeg utility node.
    if (spec.provider === "ffmpeg") {
      const workerTaskId = await resolved.enqueueFfmpegWorkerTask({
        jobIdHex,
        modelId: spec.id,
        clerkUserId: input.clerkUserId,
      });
      const workerIdHex = workerTaskId.toHexString();
      const runningJob = await markJobRunning(
        initialJob,
        {
          domainKind: "worker_ffmpeg",
          externalJobId: workerIdHex,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: runningJob,
        creditUsd,
      };
    }

    // Branch 5: Scro tool nodes (`scro:*`).
    if (spec.provider === "scro") {
      if (spec.id === "scro:auto-captions") {
        const videoUrl = inputCheck.inputs.video;
        if (!videoUrl) throw new Error("自動字幕需要輸入有聲音的影片");
        const language = normalizeCaptionLanguage(
          node.data.toolParams?.captionLanguage ?? node.data.presetId,
        );
        const out = await transcribeCaptionVideo({
          videoUrl,
          language,
          pathname: `canvas/${input.clerkUserId}/${jobIdHex}.srt`,
        });
        const completedJob = await markJobCompleted(
          initialJob,
          {
            outputUrl: out.outputUrl,
            outputKind: "text",
            extraNodePatch: { text: out.srt },
          },
          resolved,
        );
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: completedJob,
          creditUsd,
        };
      }

      if (spec.id === "scro:tts" || spec.id === "scro:life" || spec.id === "scro:poster") {
        const out = await resolved.executeScroSyncNode({
          clerkUserId: input.clerkUserId,
          jobIdHex,
          modelId: spec.id,
          node,
          inputs: inputCheck.inputs,
        });
        const completedJob = await markJobCompleted(
          initialJob,
          {
            outputUrl: out.outputUrl,
            outputKind: out.outputKind,
          },
          resolved,
        );
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: completedJob,
          creditUsd,
        };
      }

      const submitted = await resolved.submitScroAsyncNode({
        clerkUserId: input.clerkUserId,
        canvasIdHex: input.canvasId,
        jobIdHex,
        modelId: spec.id,
        node,
        inputs: inputCheck.inputs,
      });
      const runningJob = await markJobRunning(
        initialJob,
        {
          domainKind: submitted.domainKind,
          externalJobId: submitted.externalJobId,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: runningJob,
        creditUsd,
      };
    }

    // Branch 3: Asynchronous Mentalok AI Studio generation (image/video/editing/segmentation/upscale).
    const mentalokPayload = await buildMentalokJobPayload(
      spec,
      node,
      inputCheck.inputs,
      presetId,
      resolved.ensureMentalokUrl,
    );
    const created = await resolved.createMentalokJob(mentalokPayload);
    if (created.status === "failed") {
      throw new Error(created.error || "Mentalok 任務送出失敗");
    }

    if (created.status === "completed" && created.outputUrl) {
      const outputKind = spec.output.type;
      const blobPath = buildCanvasBlobPathname(
        input.clerkUserId,
        jobIdHex,
        outputKind,
        created.outputUrl,
      );
      const permanentUrl = await resolved.persistMedia(
        created.outputUrl,
        blobPath,
      );
      const completedJob = await markJobCompleted(
        initialJob,
        {
          outputUrl: permanentUrl,
          outputKind,
          externalJobId: created.id,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: completedJob,
        creditUsd,
      };
    }

    const runningJob = await markJobRunning(
      initialJob,
      { externalJobId: created.id },
      resolved,
    );
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: true,
      job: runningJob,
      creditUsd,
    };
  } catch (error) {
    const message = toErrorMessage(error, "模型執行失敗，已自動退還 USD Credit");
    const failedJob = await markJobFailed(initialJob, message, resolved);
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      error: message,
      job: failedJob,
      creditUsd,
    };
  }
}

async function settleCompletedJob(
  job: CanvasJob,
  rawOutputUrl: string,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  const outputKind: CanvasOutputKind = job.outputKind ?? "image";
  const jobIdHex = job._id.toHexString();
  const blobPath = buildCanvasBlobPathname(
    job.clerkUserId,
    jobIdHex,
    outputKind,
    rawOutputUrl,
  );

  // Persist to Vercel Blob BEFORE marking completed; transient Blob errors
  // leave the job `running` so the next poll retries without double-charging.
  let permanentUrl: string;
  try {
    permanentUrl = await resolved.persistMedia(rawOutputUrl, blobPath);
  } catch (error) {
    console.warn("[canvas-executor] transient persistMedia failure; will retry on next poll", {
      jobId: jobIdHex,
      error: toErrorMessage(error, "persistMedia failed"),
    });
    return job;
  }

  return markJobCompleted(job, { outputUrl: permanentUrl, outputKind }, resolved);
}

async function settleFailedJob(
  job: CanvasJob,
  errorMessage: string,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  return markJobFailed(job, errorMessage, resolved);
}

// Maximum wall-clock wait for an async Canvas job before failing & refunding.
export const CANVAS_ASYNC_JOB_TIMEOUT_MS = 30 * 60 * 1000;
export const CANVAS_IMAGE_JOB_TIMEOUT_MS = 15 * 60 * 1000;

export function isCanvasJobTimedOut(job: Pick<CanvasJob, "status" | "outputKind" | "provider" | "createdAt">, nowMs: number): boolean {
  if (job.status !== "queued" && job.status !== "running") return false;
  const createdMs = job.createdAt instanceof Date ? job.createdAt.getTime() : Number.NaN;
  if (!Number.isFinite(createdMs)) return false;
  const limit =
    job.outputKind === "video" || job.provider === "scro" || job.provider === "ffmpeg"
      ? CANVAS_ASYNC_JOB_TIMEOUT_MS
      : CANVAS_IMAGE_JOB_TIMEOUT_MS;
  return nowMs - createdMs >= limit;
}

async function pollSingleCanvasJob(
  job: CanvasJob,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  if (job.status === "completed") {
    return job;
  }
  if (job.status === "failed") {
    // Ensure a failed job is refunded at most once even if a prior failure crashed mid-settlement.
    if (!job.refundedAt) {
      await refundCanvasJobOnce(job._id, job.clerkUserId, resolved);
    }
    return job;
  }

  if (isCanvasJobTimedOut(job, resolved.now().getTime())) {
    return settleFailedJob(job, "模型執行逾時，USD Credit 已自動退還", resolved);
  }

  if (job.provider === "ffmpeg") {
    if (!job.externalJobId) return job;
    const wt = await resolved.findWorkerTaskStatus(job.externalJobId).catch(() => null);
    if (wt?.status === "failed") {
      return settleFailedJob(job, wt.error || "FFmpeg 處理失敗", resolved);
    }
    return job;
  }

  if (job.provider === "scro") {
    if (
      !job.externalJobId ||
      (job.domainKind !== "video" &&
        job.domainKind !== "jutsu" &&
        job.domainKind !== "teleport" &&
        job.domainKind !== "explainer_frame")
    ) {
      return job;
    }
    const pollRes = await resolved
      .pollScroAsyncJob({
        clerkUserId: job.clerkUserId,
        domainKind: job.domainKind,
        externalJobId: job.externalJobId,
      })
      .catch(() => ({ status: "running" as const }));

    if (pollRes.status === "failed") {
      return settleFailedJob(job, pollRes.error, resolved);
    }
    if (pollRes.status === "completed") {
      if (pollRes.outputUrl.includes(".public.blob.vercel-storage.com/")) {
        const outputKind: CanvasOutputKind = job.outputKind ?? "video";
        return markJobCompleted(
          job,
          { outputUrl: pollRes.outputUrl, outputKind },
          resolved,
        );
      }
      return settleCompletedJob(job, pollRes.outputUrl, resolved);
    }
    return job;
  }

  if (job.provider === "mentalok") {
    if (!job.externalJobId) return job;
    let remote: MentalokJobRecord;
    try {
      remote = await resolved.getMentalokJob(job.externalJobId);
    } catch (error) {
      console.warn("[canvas-executor] transient Mentalok poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "Mentalok poll failed"),
      });
      return job;
    }

    if (remote.status === "completed") {
      if (!remote.outputUrl) {
        return settleFailedJob(
          job,
          "Mentalok 任務已完成但未回傳輸出檔案",
          resolved,
        );
      }
      return settleCompletedJob(job, remote.outputUrl, resolved);
    }

    if (remote.status === "failed") {
      return settleFailedJob(
        job,
        remote.error || "Mentalok 生成失敗",
        resolved,
      );
    }

    return job;
  }

  if (job.provider === "google") {
    if (!job.externalJobId || job.outputKind !== "video") return job;
    let remote: GenerationSubmitResult;
    try {
      remote = await resolved.fetchGoogleStudioVideo(job.externalJobId);
    } catch (error) {
      console.warn("[canvas-executor] transient Google AI Studio poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "Google AI Studio poll failed"),
      });
      return job;
    }
    if (remote.status === "completed") {
      const rawUrl = remote.video?.url;
      if (!rawUrl) return settleFailedJob(job, "Google AI Studio 任務已完成但未回傳影片", resolved);
      return settleCompletedJob(job, rawUrl, resolved);
    }
    if (remote.status === "failed" || remote.status === "nsfw") {
      const defaultMsg =
        remote.status === "nsfw"
          ? "內容觸發安全審核限制，已自動退還 USD Credit"
          : "Google AI Studio 影片生成失敗";
      return settleFailedJob(job, remote.error || defaultMsg, resolved);
    }
    return job;
  }

  if (job.provider === "minimax") {
    if (!job.statusUrl) return job;
    let remote: GenerationSubmitResult;
    try {
      remote = await resolved.fetchMinimaxCanvasVideo(job.statusUrl);
    } catch (error) {
      console.warn("[canvas-executor] transient MiniMax poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "MiniMax poll failed"),
      });
      return job;
    }
    if (remote.status === "completed") {
      const rawUrl = remote.video?.url;
      if (!rawUrl) return settleFailedJob(job, "MiniMax 任務已完成但未回傳影片", resolved);
      return settleCompletedJob(job, rawUrl, resolved);
    }
    if (remote.status === "failed" || remote.status === "nsfw") {
      const defaultMsg =
        remote.status === "nsfw"
          ? "內容觸發安全審核限制，已自動退還 USD Credit"
          : "MiniMax 影片生成失敗";
      return settleFailedJob(job, remote.error || defaultMsg, resolved);
    }
    return job;
  }

  // OpenRouter async video polling.
  const statusUrl =
    job.statusUrl ||
    (job.externalJobId
      ? `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(job.externalJobId)}`
      : undefined);
  if (!statusUrl) return job;

  let remote: GenerationSubmitResult;
  try {
    remote = await resolved.fetchOpenRouterStatus(statusUrl);
  } catch (error) {
    console.warn("[canvas-executor] transient OpenRouter poll error", {
      jobId: job._id.toHexString(),
      error: toErrorMessage(error, "OpenRouter poll failed"),
    });
    return job;
  }

  if (remote.status === "completed") {
    const rawUrl = remote.video?.url || remote.images?.[0]?.url;
    if (!rawUrl) {
      return settleFailedJob(
        job,
        "OpenRouter 任務已完成但未回傳輸出檔案",
        resolved,
      );
    }
    return settleCompletedJob(job, rawUrl, resolved);
  }

  if (remote.status === "failed" || remote.status === "nsfw") {
    const defaultMsg =
      remote.status === "nsfw"
        ? "內容觸發安全審核限制，已自動退還 USD Credit"
        : "OpenRouter 影片生成失敗";
    return settleFailedJob(job, remote.error || defaultMsg, resolved);
  }

  return job;
}

export async function pollSingleCanvasJobById(
  jobId: ObjectId,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<CanvasJob | null> {
  const resolved = resolveDeps(deps);
  const job = resolved.findCanvasJobById
    ? await resolved.findCanvasJobById(jobId)
    : await (await canvasJobsCollection()).findOne({ _id: jobId });
  if (!job) return null;
  return pollSingleCanvasJob(job, resolved);
}

// Polls active Mentalok, OpenRouter, Scro, and FFmpeg jobs for a canvas project in parallel,
// copying completed outputs into permanent Vercel Blob storage and issuing
// idempotent single refunds on provider failures.
export async function pollCanvasJobs(
  input: PollCanvasJobsInput,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<PollCanvasJobsResult> {
  const resolved = resolveDeps(deps);
  if (!ObjectId.isValid(input.canvasId)) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { jobs: [], creditUsd };
  }

  const uniqueJobIds: ObjectId[] = [];
  const seen = new Set<string>();
  for (const rawId of input.jobIds) {
    const trimmed = rawId.trim();
    if (!trimmed || seen.has(trimmed) || !ObjectId.isValid(trimmed)) continue;
    seen.add(trimmed);
    uniqueJobIds.push(new ObjectId(trimmed));
  }

  if (uniqueJobIds.length === 0) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { jobs: [], creditUsd };
  }

  const canvasObjectId = new ObjectId(input.canvasId);
  const existingJobs = await resolved.findCanvasJobsByIds(
    canvasObjectId,
    input.clerkUserId,
    uniqueJobIds,
  );

  const updatedJobs = await Promise.all(
    existingJobs.map((job) => pollSingleCanvasJob(job, resolved)),
  );

  const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
  return { jobs: updatedJobs, creditUsd };
}

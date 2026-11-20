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
  type ResolvedCanvasInputs,
  applyCompletedJobOutputs,
  resolveNodeInputs,
} from "@/service/canvas/graph";
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
  OPENROUTER_VIDEOS_URL,
  type OpenRouterCanvasVideoInput,
  fetchOpenRouterStatus,
  hasOpenRouterKey,
  submitOpenRouterCanvasVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

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
  submitOpenRouterCanvasVideo: (
    input: OpenRouterCanvasVideoInput,
  ) => Promise<GenerationSubmitResult>;
  fetchOpenRouterStatus: (statusUrl: string) => Promise<GenerationSubmitResult>;
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
  now: () => Date;
};

export type SubmitCanvasNodeJobInput = {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
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

export type RefundCanvasJobResult = {
  refunded: boolean;
  alreadyRefunded: boolean;
  refundedUsd: number;
};

async function defaultGetUserCreditUsd(clerkUserId: string): Promise<number> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId });
  if (!user) return 0;
  return resolveUserUsdBalance(withUnlimitedCredits(user)).creditUsd;
}

function createDefaultDeps(): CanvasExecutorDeps {
  return {
    findCanvasProject: async (canvasId, clerkUserId) => {
      const projects = await canvasProjectsCollection();
      return projects.findOne({ _id: canvasId, clerkUserId });
    },
    updateCanvasNodeState: async ({
      canvasId,
      clerkUserId,
      nodeId,
      patch,
      thumbnailUrl,
      updatedAt,
    }) => {
      const projects = await canvasProjectsCollection();
      const setFields: Record<string, unknown> = { updatedAt };
      const unsetFields: Record<string, ""> = {};

      for (const [key, value] of Object.entries(patch) as Array<
        [keyof CanvasNodeData, unknown]
      >) {
        const path = `nodes.$.data.${key}`;
        if (value === undefined) {
          unsetFields[path] = "";
        } else {
          setFields[path] = value;
        }
      }
      if (thumbnailUrl) {
        setFields.thumbnailUrl = thumbnailUrl;
      }

      const updateDoc: Record<string, unknown> = { $set: setFields };
      if (Object.keys(unsetFields).length > 0) {
        updateDoc.$unset = unsetFields;
      }

      await projects.updateOne(
        { _id: canvasId, clerkUserId, "nodes.id": nodeId },
        updateDoc,
      );
    },
    insertCanvasJob: async (job) => {
      const jobs = await canvasJobsCollection();
      await jobs.insertOne(job);
    },
    updateCanvasJob: async (jobId, clerkUserId, update) => {
      const jobs = await canvasJobsCollection();
      const mongoUpdate: Record<string, unknown> = {};
      if (update.$set && Object.keys(update.$set).length > 0) {
        mongoUpdate.$set = update.$set;
      }
      if (update.$unset && Object.keys(update.$unset).length > 0) {
        mongoUpdate.$unset = update.$unset;
      }
      if (Object.keys(mongoUpdate).length === 0) return;
      await jobs.updateOne({ _id: jobId, clerkUserId }, mongoUpdate);
    },
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
    claimCanvasJobRefund: async (jobId, clerkUserId, refundedAt) => {
      const jobs = await canvasJobsCollection();
      return jobs.findOneAndUpdate(
        {
          _id: jobId,
          clerkUserId,
          refundedAt: { $exists: false },
        },
        {
          $set: { refundedAt, updatedAt: refundedAt },
        },
        { returnDocument: "after" },
      );
    },
    getCatalog: () => getCanvasModelCatalog(),
    hasMentalokKey: () => hasMentalokApiKey(),
    hasOpenRouterKey: () => hasOpenRouterKey(),
    consumeCreditUsd,
    refundCreditUsd,
    getUserCreditUsd: defaultGetUserCreditUsd,
    submitOpenRouterImage: (input) => submitOpenRouterImage(input),
    submitOpenRouterCanvasVideo: (input) => submitOpenRouterCanvasVideo(input),
    fetchOpenRouterStatus: (statusUrl) => fetchOpenRouterStatus(statusUrl),
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

// Atomically marks `refundedAt` on `canvas_jobs` (`refundedAt: { $exists: false }`)
// before refunding USD credit so concurrent polls or retries can never double-refund.
export async function refundCanvasJobOnce(
  jobId: string | ObjectId,
  clerkUserId: string,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<RefundCanvasJobResult> {
  const resolved = resolveDeps(deps);
  const objectId =
    typeof jobId === "string"
      ? ObjectId.isValid(jobId)
        ? new ObjectId(jobId)
        : null
      : jobId;

  if (!objectId) {
    return { refunded: false, alreadyRefunded: false, refundedUsd: 0 };
  }

  const claimed = await resolved.claimCanvasJobRefund(
    objectId,
    clerkUserId,
    resolved.now(),
  );
  if (!claimed) {
    return { refunded: false, alreadyRefunded: true, refundedUsd: 0 };
  }

  if (claimed.chargedUsd > 0) {
    await resolved.refundCreditUsd(
      clerkUserId,
      claimed.chargedUsd,
      claimed.spendEventKey,
    );
  }

  return {
    refunded: true,
    alreadyRefunded: false,
    refundedUsd: claimed.chargedUsd,
  };
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
  const project = await resolved.findCanvasProject(
    canvasObjectId,
    input.clerkUserId,
  );
  if (!project) {
    return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
  }

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
      : node.data.toolParams?.durationPreset === "45s"
        ? 45
        : node.data.toolParams?.durationPreset === "60s"
          ? 60
          : undefined;
  const costUsd = estimateCanvasModelCostUsd(spec, {
    durationSeconds: node.data.durationSeconds ?? durationPresetSec,
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
  const jobIdHex = jobId.toHexString();
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
    ...(node.data.durationSeconds !== undefined
      ? { durationSeconds: node.data.durationSeconds }
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

  await resolved.insertCanvasJob(initialJob);
  await resolved.updateCanvasNodeState({
    canvasId: canvasObjectId,
    clerkUserId: input.clerkUserId,
    nodeId: node.id,
    patch: {
      status: "queued",
      lastJobId: jobIdHex,
      lastCostUsd: costUsd,
      lastError: undefined,
    },
    updatedAt: now,
  });

  try {
    // Branch 1: Synchronous OpenRouter image generation -> persist directly to Blob.
    if (spec.provider === "openrouter" && spec.category === "image") {
      const response = await resolved.submitOpenRouterImage({
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt || "",
        aspectRatio: normalizeOpenRouterImageAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        resolution: node.data.resolution,
        referenceImageUrls: inputCheck.inputs.refImages,
      });

      const rawOutputUrl = response.images?.[0]?.url;
      if (response.status === "nsfw" || response.status === "failed" || !rawOutputUrl) {
        throw new Error(response.error || "OpenRouter 圖片生成失敗");
      }

      const blobPath = buildCanvasBlobPathname(
        input.clerkUserId,
        jobIdHex,
        "image",
        rawOutputUrl,
      );
      const permanentUrl = await resolved.persistMedia(rawOutputUrl, blobPath);
      const completedAt = resolved.now();

      await resolved.updateCanvasJob(jobId, input.clerkUserId, {
        $set: {
          status: "completed",
          externalJobId: response.request_id,
          outputUrl: permanentUrl,
          outputKind: "image",
          updatedAt: completedAt,
        },
        $unset: { error: "" },
      });

      await resolved.updateCanvasNodeState({
        canvasId: canvasObjectId,
        clerkUserId: input.clerkUserId,
        nodeId: node.id,
        patch: {
          status: "completed",
          lastJobId: jobIdHex,
          outputUrl: permanentUrl,
          outputKind: "image",
          lastCostUsd: costUsd,
          lastError: undefined,
        },
        thumbnailUrl: permanentUrl,
        updatedAt: completedAt,
      });

      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      const completedJob: CanvasJob = {
        ...initialJob,
        status: "completed",
        externalJobId: response.request_id,
        outputUrl: permanentUrl,
        outputKind: "image",
        updatedAt: completedAt,
      };
      return { ok: true, job: completedJob, creditUsd };
    }

    // Branch 2: Asynchronous OpenRouter video generation.
    if (spec.provider === "openrouter") {
      const response = await resolved.submitOpenRouterCanvasVideo({
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt,
        aspectRatio: normalizeOpenRouterVideoAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        durationSeconds:
          node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 5,
        startImageUrl: inputCheck.inputs.startImage,
        endImageUrl: inputCheck.inputs.endImage,
        referenceImageUrls: inputCheck.inputs.refImages,
        audioUrl: inputCheck.inputs.refAudio,
      });

      if (response.status === "failed" || response.status === "nsfw") {
        throw new Error(response.error || "OpenRouter 影片生成失敗");
      }

      const updatedAt = resolved.now();
      if (response.status === "completed" && response.video?.url) {
        const blobPath = buildCanvasBlobPathname(
          input.clerkUserId,
          jobIdHex,
          "video",
          response.video.url,
        );
        const permanentUrl = await resolved.persistMedia(
          response.video.url,
          blobPath,
        );
        await resolved.updateCanvasJob(jobId, input.clerkUserId, {
          $set: {
            status: "completed",
            externalJobId: response.request_id,
            statusUrl: response.status_url,
            outputUrl: permanentUrl,
            outputKind: "video",
            updatedAt,
          },
          $unset: { error: "" },
        });
        await resolved.updateCanvasNodeState({
          canvasId: canvasObjectId,
          clerkUserId: input.clerkUserId,
          nodeId: node.id,
          patch: {
            status: "completed",
            lastJobId: jobIdHex,
            outputUrl: permanentUrl,
            outputKind: "video",
            lastCostUsd: costUsd,
            lastError: undefined,
          },
          updatedAt,
        });
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: {
            ...initialJob,
            status: "completed",
            externalJobId: response.request_id,
            statusUrl: response.status_url,
            outputUrl: permanentUrl,
            outputKind: "video",
            updatedAt,
          },
          creditUsd,
        };
      }

      await resolved.updateCanvasJob(jobId, input.clerkUserId, {
        $set: {
          status: "running",
          externalJobId: response.request_id,
          statusUrl: response.status_url,
          updatedAt,
        },
      });
      await resolved.updateCanvasNodeState({
        canvasId: canvasObjectId,
        clerkUserId: input.clerkUserId,
        nodeId: node.id,
        patch: {
          status: "running",
          lastJobId: jobIdHex,
          lastCostUsd: costUsd,
          lastError: undefined,
        },
        updatedAt,
      });

      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: {
          ...initialJob,
          status: "running",
          externalJobId: response.request_id,
          statusUrl: response.status_url,
          updatedAt,
        },
        creditUsd,
      };
    }

    // Branch 4: Vast.ai Worker FFmpeg utility node.
    if (spec.provider === "ffmpeg") {
      const workerTaskId = await resolved.enqueueFfmpegWorkerTask({
        jobIdHex,
        modelId: spec.id,
        clerkUserId: input.clerkUserId,
      });
      const updatedAt = resolved.now();
      const workerIdHex = workerTaskId.toHexString();
      await resolved.updateCanvasJob(jobId, input.clerkUserId, {
        $set: {
          status: "running",
          domainKind: "worker_ffmpeg",
          externalJobId: workerIdHex,
          updatedAt,
        },
      });
      await resolved.updateCanvasNodeState({
        canvasId: canvasObjectId,
        clerkUserId: input.clerkUserId,
        nodeId: node.id,
        patch: {
          status: "running",
          lastJobId: jobIdHex,
          lastCostUsd: costUsd,
          lastError: undefined,
        },
        updatedAt,
      });
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: {
          ...initialJob,
          status: "running",
          domainKind: "worker_ffmpeg",
          externalJobId: workerIdHex,
          updatedAt,
        },
        creditUsd,
      };
    }

    // Branch 5: Scro tool nodes (`scro:*`).
    if (spec.provider === "scro") {
      if (spec.id === "scro:tts" || spec.id === "scro:life" || spec.id === "scro:poster") {
        const out = await resolved.executeScroSyncNode({
          clerkUserId: input.clerkUserId,
          jobIdHex,
          modelId: spec.id,
          node,
          inputs: inputCheck.inputs,
        });
        const completedAt = resolved.now();
        await resolved.updateCanvasJob(jobId, input.clerkUserId, {
          $set: {
            status: "completed",
            outputUrl: out.outputUrl,
            outputKind: out.outputKind,
            updatedAt: completedAt,
          },
          $unset: { error: "" },
        });
        await resolved.updateCanvasNodeState({
          canvasId: canvasObjectId,
          clerkUserId: input.clerkUserId,
          nodeId: node.id,
          patch: {
            status: "completed",
            lastJobId: jobIdHex,
            outputUrl: out.outputUrl,
            outputKind: out.outputKind,
            lastCostUsd: costUsd,
            lastError: undefined,
          },
          ...(out.outputKind === "image" ? { thumbnailUrl: out.outputUrl } : {}),
          updatedAt: completedAt,
        });
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: {
            ...initialJob,
            status: "completed",
            outputUrl: out.outputUrl,
            outputKind: out.outputKind,
            updatedAt: completedAt,
          },
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
      const updatedAt = resolved.now();
      await resolved.updateCanvasJob(jobId, input.clerkUserId, {
        $set: {
          status: "running",
          domainKind: submitted.domainKind,
          externalJobId: submitted.externalJobId,
          updatedAt,
        },
      });
      await resolved.updateCanvasNodeState({
        canvasId: canvasObjectId,
        clerkUserId: input.clerkUserId,
        nodeId: node.id,
        patch: {
          status: "running",
          lastJobId: jobIdHex,
          lastCostUsd: costUsd,
          lastError: undefined,
        },
        updatedAt,
      });
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: {
          ...initialJob,
          status: "running",
          domainKind: submitted.domainKind,
          externalJobId: submitted.externalJobId,
          updatedAt,
        },
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

    const updatedAt = resolved.now();
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
      await resolved.updateCanvasJob(jobId, input.clerkUserId, {
        $set: {
          status: "completed",
          externalJobId: created.id,
          outputUrl: permanentUrl,
          outputKind,
          updatedAt,
        },
        $unset: { error: "" },
      });
      await resolved.updateCanvasNodeState({
        canvasId: canvasObjectId,
        clerkUserId: input.clerkUserId,
        nodeId: node.id,
        patch: {
          status: "completed",
          lastJobId: jobIdHex,
          outputUrl: permanentUrl,
          outputKind,
          lastCostUsd: costUsd,
          lastError: undefined,
        },
        ...(outputKind === "image" ? { thumbnailUrl: permanentUrl } : {}),
        updatedAt,
      });
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: {
          ...initialJob,
          status: "completed",
          externalJobId: created.id,
          outputUrl: permanentUrl,
          outputKind,
          updatedAt,
        },
        creditUsd,
      };
    }

    await resolved.updateCanvasJob(jobId, input.clerkUserId, {
      $set: {
        status: "running",
        externalJobId: created.id,
        updatedAt,
      },
    });
    await resolved.updateCanvasNodeState({
      canvasId: canvasObjectId,
      clerkUserId: input.clerkUserId,
      nodeId: node.id,
      patch: {
        status: "running",
        lastJobId: jobIdHex,
        lastCostUsd: costUsd,
        lastError: undefined,
      },
      updatedAt,
    });

    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: true,
      job: {
        ...initialJob,
        status: "running",
        externalJobId: created.id,
        updatedAt,
      },
      creditUsd,
    };
  } catch (error) {
    const message = toErrorMessage(error, "模型執行失敗，已自動退還 USD Credit");
    const failedAt = resolved.now();

    // Idempotently refund charged USD credit and reverse any affiliate commission.
    const refund = await refundCanvasJobOnce(jobId, input.clerkUserId, resolved);

    await resolved.updateCanvasJob(jobId, input.clerkUserId, {
      $set: {
        status: "failed",
        error: message,
        updatedAt: failedAt,
      },
    });
    await resolved.updateCanvasNodeState({
      canvasId: canvasObjectId,
      clerkUserId: input.clerkUserId,
      nodeId: node.id,
      patch: {
        status: "failed",
        lastJobId: jobIdHex,
        lastError: message,
        lastCostUsd: costUsd,
      },
      updatedAt: failedAt,
    });

    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    const failedJob: CanvasJob = {
      ...initialJob,
      status: "failed",
      error: message,
      ...(refund.refunded ? { refundedAt: failedAt } : {}),
      updatedAt: failedAt,
    };
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

  const completedAt = resolved.now();
  await resolved.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "completed",
      outputUrl: permanentUrl,
      outputKind,
      updatedAt: completedAt,
    },
    $unset: { error: "" },
  });

  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "completed",
      lastJobId: jobIdHex,
      outputUrl: permanentUrl,
      outputKind,
      lastCostUsd: job.chargedUsd,
      lastError: undefined,
    },
    ...(outputKind === "image" ? { thumbnailUrl: permanentUrl } : {}),
    updatedAt: completedAt,
  });

  return {
    ...job,
    status: "completed",
    outputUrl: permanentUrl,
    outputKind,
    error: undefined,
    updatedAt: completedAt,
  };
}

async function settleFailedJob(
  job: CanvasJob,
  errorMessage: string,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  const failedAt = resolved.now();
  const refund = await refundCanvasJobOnce(job._id, job.clerkUserId, resolved);

  await resolved.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "failed",
      error: errorMessage,
      updatedAt: failedAt,
    },
  });

  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "failed",
      lastJobId: job._id.toHexString(),
      lastError: errorMessage,
      lastCostUsd: job.chargedUsd,
    },
    updatedAt: failedAt,
  });

  return {
    ...job,
    status: "failed",
    error: errorMessage,
    ...(refund.refunded ? { refundedAt: failedAt } : {}),
    updatedAt: failedAt,
  };
}

// Polls active Mentalok and OpenRouter jobs for a canvas project in parallel,
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
    existingJobs.map(async (job): Promise<CanvasJob> => {
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
            job.domainKind !== "teleport")
        ) {
          return job;
        }
        const pollRes = await resolved
          .pollScroAsyncJob({
            clerkUserId: job.clerkUserId,
            domainKind: job.domainKind as "video" | "jutsu" | "teleport",
            externalJobId: job.externalJobId,
          })
          .catch(() => ({ status: "running" as const }));

        if (pollRes.status === "failed") {
          return settleFailedJob(job, pollRes.error, resolved);
        }
        if (pollRes.status === "completed") {
          if (pollRes.outputUrl.includes(".public.blob.vercel-storage.com/")) {
            const outputKind: CanvasOutputKind = job.outputKind ?? "video";
            const completedAt = resolved.now();
            await resolved.updateCanvasJob(job._id, job.clerkUserId, {
              $set: {
                status: "completed",
                outputUrl: pollRes.outputUrl,
                outputKind,
                updatedAt: completedAt,
              },
              $unset: { error: "" },
            });
            await resolved.updateCanvasNodeState({
              canvasId: job.canvasId,
              clerkUserId: job.clerkUserId,
              nodeId: job.nodeId,
              patch: {
                status: "completed",
                lastJobId: job._id.toHexString(),
                outputUrl: pollRes.outputUrl,
                outputKind,
                lastCostUsd: job.chargedUsd,
                lastError: undefined,
              },
              updatedAt: completedAt,
            });
            return {
              ...job,
              status: "completed",
              outputUrl: pollRes.outputUrl,
              outputKind,
              error: undefined,
              updatedAt: completedAt,
            };
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
    }),
  );

  const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
  return { jobs: updatedJobs, creditUsd };
}

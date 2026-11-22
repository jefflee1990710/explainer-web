"use server";

// Authenticated Next.js Server Actions for the Interactive Node Canvas Editor (/app/canvas).

import type {
  CanvasEdge,
  CanvasMediaKind,
  CanvasNode,
  CanvasViewport,
} from "@/model/canvas";
import { canvasProjectsCollection, usersCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { withUnlimitedCredits } from "@/service/billing/unlimited-credits";
import { generateCanvasCharacterOutfit } from "@/service/canvas/character-outfit";
import {
  type SubmitCanvasNodeJobErrorCode,
  pollCanvasJobs,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
import {
  type CanvasModelSpec,
  getCanvasModelCatalog,
} from "@/service/canvas/model-catalog";
import {
  type CanvasFlowRunDto,
  type CanvasJobDto,
  type CanvasProjectDto,
  type CreateCanvasProjectInput,
  type SaveCanvasProjectPatch,
  createCanvasProject,
  deleteCanvasProject,
  saveCanvasProject,
  serializeCanvasJob,
  serializeCanvasProject,
} from "@/service/canvas/projects";
import {
  startCanvasFlowRun,
  stopCanvasFlowRun,
} from "@/service/canvas/worker-runner";
import { persistBuffer } from "@/service/higgsfield/persist";
import { shouldUseWorkerQueueOnly } from "@/service/worker/task-queue";
import { ObjectId } from "mongodb";

const CANVAS_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Strict MIME allowlist (Spec Section 6.6) mapped to Canvas media kind and Blob extension.
const ALLOWED_UPLOAD_MIME_MAP: Record<
  string,
  { mediaKind: CanvasMediaKind; ext: string }
> = {
  "image/png": { mediaKind: "image", ext: "png" },
  "image/jpeg": { mediaKind: "image", ext: "jpg" },
  "image/webp": { mediaKind: "image", ext: "webp" },
  "video/mp4": { mediaKind: "video", ext: "mp4" },
  "video/webm": { mediaKind: "video", ext: "webm" },
  "video/quicktime": { mediaKind: "video", ext: "mov" },
  "audio/mpeg": { mediaKind: "audio", ext: "mp3" },
  "audio/wav": { mediaKind: "audio", ext: "wav" },
  "audio/mp4": { mediaKind: "audio", ext: "m4a" },
  "audio/ogg": { mediaKind: "audio", ext: "ogg" },
};

export type UploadCanvasMediaActionResult =
  | {
      ok: true;
      url: string;
      mediaKind: CanvasMediaKind;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }
  | {
      ok: false;
      error: string;
    };

export type RunCanvasNodeActionInput = {
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  // Optional latest client graph snapshot so clicking Run immediately after editing
  // persists the latest prompt/edges before executing.
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
};

export type RunCanvasNodeActionResult =
  | {
      ok: true;
      job: CanvasJobDto;
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
      job?: CanvasJobDto;
    };

export type PollCanvasJobsActionResult = {
  jobs: CanvasJobDto[];
  creditUsd: number;
};

// Creates a new Canvas project owned by the signed-in user.
export async function createCanvasProjectAction(
  input?: CreateCanvasProjectInput,
): Promise<{ project: CanvasProjectDto }> {
  const user = await requireAppUser();
  const created = await createCanvasProject(user.clerkUserId, input);
  return { project: serializeCanvasProject(created) };
}

// Renames an owned Canvas project.
export async function renameCanvasProjectAction(
  canvasId: string,
  title: string,
): Promise<{ ok: true; project: CanvasProjectDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await saveCanvasProject(user.clerkUserId, canvasId, { title });
  if (!updated) {
    return { ok: false, error: "找不到畫布專案" };
  }
  return { ok: true, project: serializeCanvasProject(updated) };
}

// Deletes an owned Canvas project.
export async function deleteCanvasProjectAction(
  canvasId: string,
): Promise<{ deleted: boolean }> {
  const user = await requireAppUser();
  return deleteCanvasProject(user.clerkUserId, canvasId);
}

// Saves graph nodes, edges, viewport, title, or thumbnail for an owned Canvas project.
export async function saveCanvasProjectAction(
  canvasId: string,
  patch: SaveCanvasProjectPatch,
): Promise<{ ok: true; project: CanvasProjectDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await saveCanvasProject(user.clerkUserId, canvasId, patch);
  if (!updated) {
    return { ok: false, error: "找不到畫布專案" };
  }
  return { ok: true, project: serializeCanvasProject(updated) };
}

// Validates local file upload (<= 15 MB, strict MIME allowlist) and persists to Vercel Blob.
export async function uploadCanvasMediaAction(
  formData: FormData,
): Promise<UploadCanvasMediaActionResult> {
  const user = await requireAppUser();
  const entry = formData.get("file");
  if (!entry || typeof entry === "string") {
    return { ok: false, error: "請選擇要上傳的媒體檔案" };
  }

  const file = entry as File;
  if (file.size <= 0) {
    return { ok: false, error: "檔案內容不可為空" };
  }
  if (file.size > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小超過 15 MB 上限" };
  }

  const normalizedMime = (file.type || "").split(";")[0]?.trim().toLowerCase() || "";
  const allowed = ALLOWED_UPLOAD_MIME_MAP[normalizedMime];
  if (!allowed) {
    return {
      ok: false,
      error: `不支援的檔案格式（${normalizedMime || "unknown"}）。僅支援 PNG/JPEG/WebP、MP4/WebM/MOV、MP3/WAV/M4A/OGG。`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength <= 0 || buffer.byteLength > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小無效或超過 15 MB 上限" };
  }

  const pathname = `canvas/uploads/${user.clerkUserId}/${crypto.randomUUID()}.${allowed.ext}`;
  const url = await persistBuffer(buffer, pathname, normalizedMime);

  return {
    ok: true,
    url,
    mediaKind: allowed.mediaKind,
    fileName: file.name || `upload.${allowed.ext}`,
    contentType: normalizedMime,
    sizeBytes: buffer.byteLength,
  };
}

// Executes a single model node (deducting USD credit, persisting sync outputs, or queueing async jobs).
export async function runCanvasNodeAction(
  input: RunCanvasNodeActionInput,
): Promise<RunCanvasNodeActionResult> {
  const user = await requireAppUser();

  if (
    input.nodes !== undefined ||
    input.edges !== undefined ||
    input.viewport !== undefined
  ) {
    const saved = await saveCanvasProject(user.clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) {
      return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
    }
  }

  const result = await submitCanvasNodeJob({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
    flowRunId: input.flowRunId,
    queueToWorker: true,
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      error: result.error,
      ...(result.creditUsd !== undefined ? { creditUsd: result.creditUsd } : {}),
      ...(result.requiredUsd !== undefined
        ? { requiredUsd: result.requiredUsd }
        : {}),
      ...(result.availableUsd !== undefined
        ? { availableUsd: result.availableUsd }
        : {}),
      ...(result.missingRequiredFields
        ? { missingRequiredFields: result.missingRequiredFields }
        : {}),
      ...(result.missingUpstreamNodeIds
        ? { missingUpstreamNodeIds: result.missingUpstreamNodeIds }
        : {}),
      ...(result.job ? { job: serializeCanvasJob(result.job) } : {}),
    };
  }

  return {
    ok: true,
    job: serializeCanvasJob(result.job),
    creditUsd: result.creditUsd,
  };
}

// Polls active async jobs for a canvas project and returns updated job DTOs plus fresh creditUsd.
export async function pollCanvasJobsAction(input: {
  canvasId: string;
  jobIds: string[];
}): Promise<PollCanvasJobsActionResult> {
  const user = await requireAppUser();
  if (shouldUseWorkerQueueOnly() && ObjectId.isValid(input.canvasId)) {
    const { canvasJobsCollection } = await import("@/dao");
    const uniqueIds = input.jobIds
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const [jobs, users] = await Promise.all([
      uniqueIds.length > 0
        ? (await canvasJobsCollection())
            .find({
              _id: { $in: uniqueIds },
              canvasId: new ObjectId(input.canvasId),
              clerkUserId: user.clerkUserId,
            })
            .toArray()
        : Promise.resolve([]),
      usersCollection(),
    ]);
    const freshUser = await users.findOne({ clerkUserId: user.clerkUserId });
    const creditUsd = freshUser
      ? resolveUserUsdBalance(withUnlimitedCredits(freshUser)).creditUsd
      : 0;
    return {
      jobs: jobs.map(serializeCanvasJob),
      creditUsd,
    };
  }
  const result = await pollCanvasJobs({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    jobIds: input.jobIds,
  });
  return {
    jobs: result.jobs.map(serializeCanvasJob),
    creditUsd: result.creditUsd,
  };
}

// Force-refreshes live Mentalok pricing/status metadata and returns the model catalog.
export async function refreshCanvasModelsAction(): Promise<{
  models: CanvasModelSpec[];
}> {
  await requireAppUser();
  const models = await getCanvasModelCatalog({ forceRefresh: true });
  return { models };
}

export async function runCanvasFlowAction(input: {
  canvasId: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  // Run group: only these nodes run, in dependency order.
  nodeIds?: string[];
}): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunDto; creditUsd: number }
  | { ok: false; error: string }
> {
  const user = await requireAppUser();
  if (input.nodes !== undefined || input.edges !== undefined || input.viewport !== undefined) {
    const saved = await saveCanvasProject(user.clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) return { ok: false, error: "找不到畫布專案" };
  }

  const started = await startCanvasFlowRun({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    ...(input.nodeIds ? { nodeIds: input.nodeIds } : {}),
  });
  if (!started.ok) return started;

  const users = await usersCollection();
  const freshUser = await users.findOne({ clerkUserId: user.clerkUserId });
  const creditUsd = freshUser
    ? resolveUserUsdBalance(withUnlimitedCredits(freshUser)).creditUsd
    : 0;

  return {
    ok: true,
    activeFlowRun: {
      flowRunId: started.activeFlowRun.flowRunId,
      status: started.activeFlowRun.status,
      currentWave: started.activeFlowRun.currentWave,
      totalWaves: started.activeFlowRun.totalWaves,
      failedNodeIds: started.activeFlowRun.failedNodeIds,
      ...(started.activeFlowRun.error ? { error: started.activeFlowRun.error } : {}),
    },
    creditUsd,
  };
}

export async function stopCanvasFlowAction(canvasId: string): Promise<{ ok: true }> {
  const user = await requireAppUser();
  await stopCanvasFlowRun({ clerkUserId: user.clerkUserId, canvasId });
  return { ok: true };
}

export async function pollCanvasFlowAction(canvasId: string): Promise<{
  nodes: CanvasNode[];
  activeFlowRun?: CanvasFlowRunDto;
  creditUsd: number;
}> {
  const user = await requireAppUser();
  if (!ObjectId.isValid(canvasId)) {
    return { nodes: [], creditUsd: 0 };
  }
  const col = await canvasProjectsCollection();
  let project = await col.findOne({
    _id: new ObjectId(canvasId),
    clerkUserId: user.clerkUserId,
  });
  if (!project) {
    return { nodes: [], creditUsd: 0 };
  }

  // In local dev without an external Vast worker, nudge in-flight wave jobs on poll.
  if (!shouldUseWorkerQueueOnly() && project.activeFlowRun?.activeWaveJobIds?.length) {
    await pollCanvasJobs({
      clerkUserId: user.clerkUserId,
      canvasId,
      jobIds: project.activeFlowRun.activeWaveJobIds,
    }).catch(() => {});
    project =
      (await col.findOne({
        _id: new ObjectId(canvasId),
        clerkUserId: user.clerkUserId,
      })) ?? project;
  }

  const users = await usersCollection();
  const freshUser = await users.findOne({ clerkUserId: user.clerkUserId });
  const creditUsd = freshUser
    ? resolveUserUsdBalance(withUnlimitedCredits(freshUser)).creditUsd
    : 0;

  return {
    nodes: project.nodes,
    ...(project.activeFlowRun
      ? {
          activeFlowRun: {
            flowRunId: project.activeFlowRun.flowRunId,
            status: project.activeFlowRun.status,
            currentWave: project.activeFlowRun.currentWave,
            totalWaves: project.activeFlowRun.totalWaves,
            failedNodeIds: project.activeFlowRun.failedNodeIds ?? [],
            ...(project.activeFlowRun.error ? { error: project.activeFlowRun.error } : {}),
          },
        }
      : {}),
    creditUsd,
  };
}

// Character node: branch a new outfit from the pieces wired into that person.
export async function generateCanvasCharacterOutfitAction(input: {
  characterId: string;
  instruction: string;
}) {
  await requireAppUser();
  return generateCanvasCharacterOutfit(input);
}

"use server";

// Thin authenticated Next.js Server Actions for the Interactive Node Canvas Editor (/app/canvas).
// Delegates all domain rules, persistence, and worker polling to `src/service/canvas/*`.

import { revalidatePath } from "next/cache";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasViewport,
} from "@/model/canvas";
import type {
  CanvasFlowRunDto,
  CanvasFolderDto,
  CanvasJobDto,
  CanvasProjectDto,
  CreateCanvasProjectInput,
  SaveCanvasProjectPatch,
} from "@/model/canvas-dto";
import {
  serializeCanvasFlowRun,
  serializeCanvasJob,
  serializeCanvasProject,
} from "@/presentation/serialize/canvas";
import { requireAppUser } from "@/service/auth";
import { generateCanvasCharacterOutfit } from "@/service/canvas/use-cases/character-outfit";
import { saveCanvasCharacterBlueprint } from "@/service/canvas/use-cases/save-character-blueprint";
import { toPublicCharacter, type PublicCharacter } from "@/presentation/serialize";
import type { SubmitCanvasNodeJobErrorCode } from "@/service/canvas/execution/executor";
import {
  createCanvasFolder,
  deleteCanvasFolder,
  listCanvasFolders,
  moveCanvasToFolder,
  renameCanvasFolder,
  serializeCanvasFolder,
} from "@/service/canvas/use-cases/folders";
import {
  type UploadCanvasMediaResult,
  uploadCanvasMediaFromFormData,
} from "@/service/canvas/use-cases/media-upload";
import {
  type CanvasModelSpec,
  getCanvasModelCatalog,
} from "@/service/canvas/catalog/model-catalog";
import {
  createCanvasProject,
  deleteCanvasProject,
  saveCanvasProject,
} from "@/service/canvas/use-cases/projects";
import {
  pollCanvasFlowForClient,
  pollCanvasJobsForClient,
  runCanvasFlowWithPreSave,
  runCanvasNodeWithPreSave,
} from "@/service/canvas/execution/runtime";
import { stopCanvasFlowRun } from "@/service/canvas/execution/worker-runner";

export type UploadCanvasMediaActionResult = UploadCanvasMediaResult;

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
      // A wired upstream node is still running; a flow run waits for it, then runs this node.
      ok: true;
      waitingForUpstream: true;
      activeFlowRun: CanvasFlowRunDto;
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

export async function listCanvasFoldersAction(): Promise<CanvasFolderDto[]> {
  const user = await requireAppUser();
  const folders = await listCanvasFolders(user.clerkUserId);
  return folders.map(serializeCanvasFolder);
}

export async function createCanvasFolderAction(
  name: string,
): Promise<{ ok: true; folder: CanvasFolderDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const created = await createCanvasFolder(user.clerkUserId, name);
  if (!created) return { ok: false, error: "資料夾名稱不能是空白" };
  return { ok: true, folder: serializeCanvasFolder(created) };
}

export async function renameCanvasFolderAction(
  folderId: string,
  name: string,
): Promise<{ ok: true; folder: CanvasFolderDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await renameCanvasFolder(user.clerkUserId, folderId, name);
  if (!updated) return { ok: false, error: "找不到資料夾" };
  return { ok: true, folder: serializeCanvasFolder(updated) };
}

export async function deleteCanvasFolderAction(
  folderId: string,
): Promise<{ ok: boolean }> {
  const user = await requireAppUser();
  return { ok: await deleteCanvasFolder(user.clerkUserId, folderId) };
}

export async function moveCanvasToFolderAction(
  canvasId: string,
  folderId: string | null,
): Promise<{ ok: boolean }> {
  const user = await requireAppUser();
  return { ok: await moveCanvasToFolder(user.clerkUserId, canvasId, folderId) };
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
  return uploadCanvasMediaFromFormData(user.clerkUserId, formData);
}

// Executes a single model node (deducting USD credit, persisting sync outputs, or queueing async jobs).
export async function runCanvasNodeAction(
  input: RunCanvasNodeActionInput,
): Promise<RunCanvasNodeActionResult> {
  const user = await requireAppUser();
  const result = await runCanvasNodeWithPreSave({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
    flowRunId: input.flowRunId,
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      error: result.error,
      ...(result.creditUsd !== undefined ? { creditUsd: result.creditUsd } : {}),
      ...(result.requiredUsd !== undefined ? { requiredUsd: result.requiredUsd } : {}),
      ...(result.availableUsd !== undefined ? { availableUsd: result.availableUsd } : {}),
      ...(result.missingRequiredFields
        ? { missingRequiredFields: result.missingRequiredFields }
        : {}),
      ...(result.missingUpstreamNodeIds
        ? { missingUpstreamNodeIds: result.missingUpstreamNodeIds }
        : {}),
      ...(result.job ? { job: serializeCanvasJob(result.job) } : {}),
    };
  }

  if ("waitingForUpstream" in result) {
    return {
      ok: true,
      waitingForUpstream: true,
      activeFlowRun: serializeCanvasFlowRun(result.activeFlowRun),
      creditUsd: result.creditUsd,
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
  const result = await pollCanvasJobsForClient({
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
  nodeIds?: string[];
  rerunNodeIds?: string[];
  rerunAll?: boolean;
}): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunDto; creditUsd: number }
  | { ok: false; error: string }
> {
  const user = await requireAppUser();
  const started = await runCanvasFlowWithPreSave({
    clerkUserId: user.clerkUserId,
    canvasId: input.canvasId,
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
    nodeIds: input.nodeIds,
    rerunNodeIds: input.rerunNodeIds,
    rerunAll: input.rerunAll,
  });
  if (!started.ok) return started;

  return {
    ok: true,
    activeFlowRun: serializeCanvasFlowRun(started.activeFlowRun),
    creditUsd: started.creditUsd,
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
  const polled = await pollCanvasFlowForClient({
    clerkUserId: user.clerkUserId,
    canvasId,
  });
  return {
    nodes: polled.nodes,
    ...(polled.activeFlowRun
      ? { activeFlowRun: serializeCanvasFlowRun(polled.activeFlowRun) }
      : {}),
    creditUsd: polled.creditUsd,
  };
}

// Empty character node: store the finished Seedream blueprint as a library character.
export async function saveCanvasCharacterBlueprintAction(input: {
  name?: string;
  blueprintUrl?: string;
  prompt?: string;
  referenceImageUrls?: string[];
}): Promise<{ ok: true; character: PublicCharacter } | { ok: false; error: string }> {
  const result = await saveCanvasCharacterBlueprint(input);
  if (!result.ok) return result;
  const character = toPublicCharacter(result.character);
  revalidatePath("/app/characters");
  revalidatePath(`/app/characters/${character.id}`);
  return { ok: true, character };
}

// Character node: branch a new outfit from the pieces wired into that person.
export async function generateCanvasCharacterOutfitAction(input: {
  characterId: string;
  instruction: string;
  updateDefaultOutfit?: boolean;
}) {
  await requireAppUser();
  return generateCanvasCharacterOutfit(input);
}

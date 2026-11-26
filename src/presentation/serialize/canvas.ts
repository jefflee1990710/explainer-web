// Public JSON-safe DTO serializers for Canvas projects, jobs, and active flow runs.

import type {
  CanvasFlowRunState,
  CanvasJob,
  CanvasProject,
} from "@/model/canvas";
import type {
  CanvasFlowRunDto,
  CanvasJobDto,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
} from "@/model/canvas-dto";
import { canvasGroupsForProject } from "@/service/canvas/core/groups";
import { failOrphanBusyNodes } from "@/service/canvas/core/orphan-busy";

// Converts persisted flow run state into a compact client DTO.
export function serializeCanvasFlowRun(
  run: Pick<
    CanvasFlowRunState,
    "flowRunId" | "status" | "currentWave" | "totalWaves" | "failedNodeIds" | "error"
  >,
): CanvasFlowRunDto {
  return {
    flowRunId: run.flowRunId,
    status: run.status,
    currentWave: run.currentWave,
    totalWaves: run.totalWaves,
    failedNodeIds: run.failedNodeIds ?? [],
    ...(run.error ? { error: run.error } : {}),
  };
}

// Serializes a MongoDB CanvasProject into a plain JSON-safe DTO for Client Components.
export function serializeCanvasProject(project: CanvasProject): CanvasProjectDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    viewport: project.viewport,
    nodes: failOrphanBusyNodes(
      project.nodes,
      project.activeFlowRun?.status === "running",
    ),
    edges: project.edges,
    groups: canvasGroupsForProject(project.nodes, project.groups),
    ...(project.activeFlowRun
      ? { activeFlowRun: serializeCanvasFlowRun(project.activeFlowRun) }
      : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a CanvasProject into a lightweight list item for the project switcher dropdown.
export function serializeCanvasProjectSummary(
  project: CanvasProject,
): CanvasProjectSummaryDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    nodeCount: project.nodes.length,
    ...(project.folderId ? { folderId: project.folderId.toHexString() } : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a MongoDB CanvasJob into a plain JSON-safe DTO for Server Actions.
export function serializeCanvasJob(job: CanvasJob): CanvasJobDto {
  return {
    id: job._id.toHexString(),
    canvasId: job.canvasId.toHexString(),
    nodeId: job.nodeId,
    ...(job.flowRunId ? { flowRunId: job.flowRunId } : {}),
    provider: job.provider,
    modelId: job.modelId,
    providerModelId: job.providerModelId,
    ...(job.presetId ? { presetId: job.presetId } : {}),
    status: job.status,
    ...(job.externalJobId ? { externalJobId: job.externalJobId } : {}),
    chargedUsd: job.chargedUsd,
    ...(job.refundedAt ? { refundedAt: job.refundedAt.toISOString() } : {}),
    ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
    ...(job.outputKind ? { outputKind: job.outputKind } : {}),
    ...(job.error ? { error: job.error } : {}),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

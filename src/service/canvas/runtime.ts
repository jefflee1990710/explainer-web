// Domain runtime orchestration for Canvas node execution, multi-wave flows,
// and dual-mode client polling (Vast worker queue vs. local in-process dev).

import { ObjectId } from "mongodb";
import {
  canvasJobsCollection,
  canvasProjectsCollection,
} from "@/dao";
import type {
  CanvasEdge,
  CanvasFlowRunState,
  CanvasJob,
  CanvasNode,
  CanvasProject,
  CanvasViewport,
} from "@/model/canvas";
import {
  type PollCanvasJobsResult,
  type SubmitCanvasNodeJobErrorCode,
  pollCanvasJobs,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
import { readUserCreditUsd } from "@/service/canvas/job-ledger";
import {
  healFinishedCanvasRuns,
  saveCanvasProject,
} from "@/service/canvas/projects";
import {
  executeCanvasFlowTask,
  startCanvasFlowRun,
  startCanvasNodeAfterUpstream,
} from "@/service/canvas/worker-runner";
import { shouldUseWorkerQueueOnly } from "@/service/worker/task-queue";

export { readUserCreditUsd };

export type RunCanvasNodeRuntimeInput = {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
};

export type RunCanvasNodeRuntimeResult =
  | {
      ok: true;
      job: CanvasJob;
      creditUsd: number;
    }
  | {
      ok: true;
      waitingForUpstream: true;
      activeFlowRun: CanvasFlowRunState;
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

export type CanvasRuntimeDeps = {
  saveCanvasProject: typeof saveCanvasProject;
  startCanvasNodeAfterUpstream: typeof startCanvasNodeAfterUpstream;
  submitCanvasNodeJob: typeof submitCanvasNodeJob;
  pollCanvasJobs: typeof pollCanvasJobs;
  startCanvasFlowRun: typeof startCanvasFlowRun;
  executeCanvasFlowTask: typeof executeCanvasFlowTask;
  healFinishedCanvasRuns: typeof healFinishedCanvasRuns;
  shouldUseWorkerQueueOnly: typeof shouldUseWorkerQueueOnly;
  readUserCreditUsd: (clerkUserId: string) => Promise<number>;
  findJobsByIds: (
    canvasId: ObjectId,
    clerkUserId: string,
    jobIds: ObjectId[],
  ) => Promise<CanvasJob[]>;
  findCanvasProject: (
    canvasId: ObjectId,
    clerkUserId: string,
  ) => Promise<CanvasProject | null>;
};

function resolveRuntimeDeps(overrides?: Partial<CanvasRuntimeDeps>): CanvasRuntimeDeps {
  const defaults: CanvasRuntimeDeps = {
    saveCanvasProject,
    startCanvasNodeAfterUpstream,
    submitCanvasNodeJob,
    pollCanvasJobs,
    startCanvasFlowRun,
    executeCanvasFlowTask,
    healFinishedCanvasRuns,
    shouldUseWorkerQueueOnly,
    readUserCreditUsd,
    findJobsByIds: async (canvasId, clerkUserId, jobIds) => {
      if (jobIds.length === 0) return [];
      const col = await canvasJobsCollection();
      return col
        .find({ _id: { $in: jobIds }, canvasId, clerkUserId })
        .toArray();
    },
    findCanvasProject: async (canvasId, clerkUserId) => {
      const col = await canvasProjectsCollection();
      return col.findOne({ _id: canvasId, clerkUserId });
    },
  };
  return overrides ? { ...defaults, ...overrides } : defaults;
}

// Saves any pending graph edits, checks for busy wired upstreams, or queues the node job.
export async function runCanvasNodeWithPreSave(
  input: RunCanvasNodeRuntimeInput,
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<RunCanvasNodeRuntimeResult> {
  const resolved = resolveRuntimeDeps(deps);

  if (
    input.nodes !== undefined ||
    input.edges !== undefined ||
    input.viewport !== undefined
  ) {
    const saved = await resolved.saveCanvasProject(input.clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) {
      return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
    }
  }

  if (!input.flowRunId) {
    const waiting = await resolved.startCanvasNodeAfterUpstream({
      clerkUserId: input.clerkUserId,
      canvasId: input.canvasId,
      nodeId: input.nodeId,
    });
    if (waiting && !waiting.ok) {
      return { ok: false, code: "INVALID_INPUTS", error: waiting.error };
    }
    if (waiting) {
      const creditUsd = await resolved.readUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        waitingForUpstream: true,
        activeFlowRun: waiting.activeFlowRun,
        creditUsd,
      };
    }
  }

  return resolved.submitCanvasNodeJob({
    clerkUserId: input.clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
    flowRunId: input.flowRunId,
    queueToWorker: true,
  });
}

// Reads settled jobs from MongoDB in worker-queue mode, or actively polls providers in local dev.
export async function pollCanvasJobsForClient(
  input: {
    clerkUserId: string;
    canvasId: string;
    jobIds: string[];
  },
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<PollCanvasJobsResult> {
  const resolved = resolveRuntimeDeps(deps);

  if (resolved.shouldUseWorkerQueueOnly() && ObjectId.isValid(input.canvasId)) {
    const uniqueIds = input.jobIds
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const [jobs, creditUsd] = await Promise.all([
      resolved.findJobsByIds(new ObjectId(input.canvasId), input.clerkUserId, uniqueIds),
      resolved.readUserCreditUsd(input.clerkUserId),
    ]);
    return { jobs, creditUsd };
  }

  return resolved.pollCanvasJobs({
    clerkUserId: input.clerkUserId,
    canvasId: input.canvasId,
    jobIds: input.jobIds,
  });
}

// Saves pending graph edits and starts a multi-wave flow run.
export async function runCanvasFlowWithPreSave(
  input: {
    clerkUserId: string;
    canvasId: string;
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
    viewport?: CanvasViewport;
    nodeIds?: string[];
    rerunNodeIds?: string[];
    rerunAll?: boolean;
  },
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunState; creditUsd: number }
  | { ok: false; error: string }
> {
  const resolved = resolveRuntimeDeps(deps);

  if (
    input.nodes !== undefined ||
    input.edges !== undefined ||
    input.viewport !== undefined
  ) {
    const saved = await resolved.saveCanvasProject(input.clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) return { ok: false, error: "找不到畫布專案" };
  }

  const started = await resolved.startCanvasFlowRun({
    clerkUserId: input.clerkUserId,
    canvasId: input.canvasId,
    ...(input.nodeIds ? { nodeIds: input.nodeIds } : {}),
    ...(input.rerunNodeIds ? { rerunNodeIds: input.rerunNodeIds } : {}),
    ...(input.rerunAll ? { rerunAll: true } : {}),
  });
  if (!started.ok) return started;

  const creditUsd = await resolved.readUserCreditUsd(input.clerkUserId);
  return {
    ok: true,
    activeFlowRun: started.activeFlowRun,
    creditUsd,
  };
}

// Polls flow progress, stepping waves in-process when no external Vast worker is configured.
export async function pollCanvasFlowForClient(
  input: {
    clerkUserId: string;
    canvasId: string;
  },
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<{
  nodes: CanvasNode[];
  activeFlowRun?: CanvasFlowRunState;
  creditUsd: number;
}> {
  const resolved = resolveRuntimeDeps(deps);
  if (!ObjectId.isValid(input.canvasId)) {
    return { nodes: [], creditUsd: 0 };
  }
  const canvasObjectId = new ObjectId(input.canvasId);
  let project = await resolved.findCanvasProject(canvasObjectId, input.clerkUserId);
  if (!project) {
    return { nodes: [], creditUsd: 0 };
  }

  // Local dev has no Vast worker: settle the current wave and advance the flow in-process.
  if (!resolved.shouldUseWorkerQueueOnly() && project.activeFlowRun?.status === "running") {
    if (project.activeFlowRun.activeWaveJobIds?.length) {
      await resolved
        .pollCanvasJobs({
          clerkUserId: input.clerkUserId,
          canvasId: input.canvasId,
          jobIds: project.activeFlowRun.activeWaveJobIds,
        })
        .catch(() => {});
    }
    const now = new Date();
    await resolved
      .executeCanvasFlowTask({
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: input.canvasId,
        payload: {
          flowRunId: project.activeFlowRun.flowRunId,
          clerkUserId: input.clerkUserId,
        },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .catch(() => {});
    project = (await resolved.findCanvasProject(canvasObjectId, input.clerkUserId)) ?? project;
  }

  const [nodes, creditUsd] = await Promise.all([
    resolved.healFinishedCanvasRuns(input.clerkUserId, project._id, project.nodes),
    resolved.readUserCreditUsd(input.clerkUserId),
  ]);

  return {
    nodes,
    ...(project.activeFlowRun ? { activeFlowRun: project.activeFlowRun } : {}),
    creditUsd,
  };
}

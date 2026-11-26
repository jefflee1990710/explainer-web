// Single authoritative ledger for `canvas_jobs` state transitions, idempotent
// USD credit refunds, and synchronized `canvas_projects.nodes.$.data` write-backs.

import { ObjectId } from "mongodb";
import { canvasJobsCollection, canvasProjectsCollection } from "@/dao";
import type {
  CanvasJob,
  CanvasJobDomainKind,
  CanvasNodeData,
  CanvasOutputKind,
} from "@/model/canvas";
import { refundCreditUsd } from "@/service/billing/credits";

export type RefundCanvasJobResult = {
  refunded: boolean;
  alreadyRefunded: boolean;
  refundedUsd: number;
};

export type UpdateCanvasNodeStateParams = {
  canvasId: ObjectId;
  clerkUserId: string;
  nodeId: string;
  patch: Partial<CanvasNodeData>;
  thumbnailUrl?: string;
  updatedAt: Date;
};

export type CanvasJobLedgerDeps = {
  insertCanvasJob: (job: CanvasJob) => Promise<void>;
  updateCanvasJob: (
    jobId: ObjectId,
    clerkUserId: string,
    update: {
      $set?: Partial<CanvasJob>;
      $unset?: Partial<Record<keyof CanvasJob, "" | 1>>;
    },
  ) => Promise<void>;
  updateCanvasNodeState: (params: UpdateCanvasNodeStateParams) => Promise<void>;
  claimCanvasJobRefund: (
    jobId: ObjectId,
    clerkUserId: string,
    refundedAt: Date,
  ) => Promise<CanvasJob | null>;
  refundCreditUsd: (
    clerkUserId: string,
    costUsd: number,
    spendEventKey?: string,
  ) => Promise<void>;
  now: () => Date;
};

// Pure builder for MongoDB positional `nodes.$.data` updates so `staleOutputUrl`
// cleanup and `thumbnailUrl` promotion share one exact rule across all engines.
export function buildNodeStateMongoUpdate(params: {
  patch: Partial<CanvasNodeData>;
  thumbnailUrl?: string;
  updatedAt: Date;
}): {
  $set: Record<string, unknown>;
  $unset?: Record<string, "">;
} {
  const setFields: Record<string, unknown> = { updatedAt: params.updatedAt };
  const unsetFields: Record<string, ""> = {};

  for (const [key, value] of Object.entries(params.patch) as Array<
    [keyof CanvasNodeData, unknown]
  >) {
    const path = `nodes.$.data.${key}`;
    if (value === undefined) {
      unsetFields[path] = "";
    } else {
      setFields[path] = value;
    }
  }

  if (params.thumbnailUrl) {
    setFields.thumbnailUrl = params.thumbnailUrl;
  }

  // A finished rerun becomes the current preview, clearing any stale badge.
  if (
    params.patch.status === "completed" &&
    typeof params.patch.outputUrl === "string" &&
    params.patch.outputUrl.trim()
  ) {
    unsetFields["nodes.$.data.staleOutputUrl"] = "";
  }

  const updateDoc: { $set: Record<string, unknown>; $unset?: Record<string, ""> } = {
    $set: setFields,
  };
  if (Object.keys(unsetFields).length > 0) {
    updateDoc.$unset = unsetFields;
  }
  return updateDoc;
}

export function createDefaultCanvasJobLedgerDeps(): CanvasJobLedgerDeps {
  return {
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
    updateCanvasNodeState: async ({
      canvasId,
      clerkUserId,
      nodeId,
      patch,
      thumbnailUrl,
      updatedAt,
    }) => {
      const projects = await canvasProjectsCollection();
      const updateDoc = buildNodeStateMongoUpdate({ patch, thumbnailUrl, updatedAt });
      await projects.updateOne(
        { _id: canvasId, clerkUserId, "nodes.id": nodeId },
        updateDoc,
      );
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
    refundCreditUsd,
    now: () => new Date(),
  };
}

function resolveLedgerDeps(overrides?: Partial<CanvasJobLedgerDeps>): CanvasJobLedgerDeps {
  const defaults = createDefaultCanvasJobLedgerDeps();
  return overrides ? { ...defaults, ...overrides } : defaults;
}

// Atomically claims `refundedAt` on `canvas_jobs` (`refundedAt: { $exists: false }`)
// before refunding USD credit so concurrent polls or retries never double-refund.
export async function refundCanvasJobOnce(
  jobId: string | ObjectId,
  clerkUserId: string,
  deps?: Partial<CanvasJobLedgerDeps>,
): Promise<RefundCanvasJobResult> {
  const resolved = resolveLedgerDeps(deps);
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

// Inserts a newly queued job and synchronizes the node status to `queued`.
export async function markJobQueued(
  job: CanvasJob,
  deps?: Partial<CanvasJobLedgerDeps>,
): Promise<CanvasJob> {
  const resolved = resolveLedgerDeps(deps);
  await resolved.insertCanvasJob(job);
  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "queued",
      lastJobId: job._id.toHexString(),
      lastCostUsd: job.chargedUsd,
      lastError: undefined,
    },
    updatedAt: job.updatedAt,
  });
  return job;
}

// Transitions a dispatched job to `running` and updates the canvas node state.
export async function markJobRunning(
  job: CanvasJob,
  meta: {
    domainKind?: CanvasJobDomainKind;
    externalJobId?: string;
    statusUrl?: string;
  },
  deps?: Partial<CanvasJobLedgerDeps>,
): Promise<CanvasJob> {
  const resolved = resolveLedgerDeps(deps);
  const updatedAt = resolved.now();
  const jobSet: Partial<CanvasJob> = {
    status: "running",
    ...(meta.domainKind !== undefined ? { domainKind: meta.domainKind } : {}),
    ...(meta.externalJobId !== undefined ? { externalJobId: meta.externalJobId } : {}),
    ...(meta.statusUrl !== undefined ? { statusUrl: meta.statusUrl } : {}),
    updatedAt,
  };

  await resolved.updateCanvasJob(job._id, job.clerkUserId, { $set: jobSet });
  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "running",
      lastJobId: job._id.toHexString(),
      lastCostUsd: job.chargedUsd,
      lastError: undefined,
    },
    updatedAt,
  });

  return {
    ...job,
    ...jobSet,
  };
}

// Settles a job as `completed`, clears errors/stale flags, and promotes image thumbnails.
export async function markJobCompleted(
  job: CanvasJob,
  completion: {
    outputUrl: string;
    outputKind: CanvasOutputKind;
    externalJobId?: string;
    statusUrl?: string;
    extraNodePatch?: Partial<CanvasNodeData>;
    includeCostInPatch?: boolean;
  },
  deps?: Partial<CanvasJobLedgerDeps>,
): Promise<CanvasJob> {
  const resolved = resolveLedgerDeps(deps);
  const completedAt = resolved.now();
  const jobSet: Partial<CanvasJob> = {
    status: "completed",
    ...(completion.externalJobId !== undefined
      ? { externalJobId: completion.externalJobId }
      : {}),
    ...(completion.statusUrl !== undefined ? { statusUrl: completion.statusUrl } : {}),
    outputUrl: completion.outputUrl,
    outputKind: completion.outputKind,
    updatedAt: completedAt,
  };

  await resolved.updateCanvasJob(job._id, job.clerkUserId, {
    $set: jobSet,
    $unset: { error: "" },
  });

  const includeCost = completion.includeCostInPatch ?? true;
  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "completed",
      lastJobId: job._id.toHexString(),
      outputUrl: completion.outputUrl,
      outputKind: completion.outputKind,
      ...(includeCost ? { lastCostUsd: job.chargedUsd } : {}),
      lastError: undefined,
      ...(completion.extraNodePatch ?? {}),
    },
    ...(completion.outputKind === "image" ? { thumbnailUrl: completion.outputUrl } : {}),
    updatedAt: completedAt,
  });

  return {
    ...job,
    ...jobSet,
    error: undefined,
  };
}

// Settles a job as `failed`, triggers idempotent refund unless skipped, and writes node error.
export async function markJobFailed(
  job: CanvasJob,
  errorMessage: string,
  deps?: Partial<CanvasJobLedgerDeps>,
  options?: {
    skipRefund?: boolean;
    includeCostInPatch?: boolean;
  },
): Promise<CanvasJob> {
  const resolved = resolveLedgerDeps(deps);
  const failedAt = resolved.now();
  const refund = options?.skipRefund
    ? { refunded: false, alreadyRefunded: false, refundedUsd: 0 }
    : await refundCanvasJobOnce(job._id, job.clerkUserId, resolved);

  await resolved.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "failed",
      error: errorMessage,
      updatedAt: failedAt,
    },
  });

  const includeCost = options?.includeCostInPatch ?? true;
  await resolved.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "failed",
      lastJobId: job._id.toHexString(),
      lastError: errorMessage,
      ...(includeCost ? { lastCostUsd: job.chargedUsd } : {}),
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

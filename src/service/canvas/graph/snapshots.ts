// Merges saved node snapshots with newer jobs so an older autosave cannot revive a preview.
// Callers keep importing these from "@/service/canvas/graph".

import type { CanvasNode, CanvasNodeData, CanvasOutputKind } from "@/model/canvas";

export type CompletedCanvasOutput = {
  nodeId: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  updatedAt: Date;
};

// Keeps a finished model output when a stale client snapshot is saved before
// React has painted the completed job back onto the node.
export function mergeCanvasNodeSnapshots(
  existing: readonly CanvasNode[],
  incoming: readonly CanvasNode[],
): CanvasNode[] {
  const previousById = new Map(existing.map((node) => [node.id, node]));
  return incoming.map((node) => {
    const previous = previousById.get(node.id);
    if (!previous || previous.type !== node.type || (node.type !== "model" && node.type !== "character")) {
      return node;
    }
    const previousUrl = previous.data.outputUrl?.trim();
    const incomingUrl = node.data.outputUrl?.trim();
    // A newer clear stamp means the client intentionally reset this node (e.g. Director Replan).
    // Do not let an older stored lastJobId or outputUrl resurrect the cleared preview.
    if (!incomingUrl && isNewerClearStamp(node.data.outputClearedAt, previous.data.outputClearedAt)) {
      return node;
    }
    // A newer job id is the run that just started or just finished. An older
    // autosave must not put that node back to "running" or swap in the old preview.
    if (isNewerJob(previous.data.lastJobId, node.data.lastJobId)) {
      return {
        ...node,
        data: {
          ...node.data,
          ...(previous.data.status ? { status: previous.data.status } : {}),
          ...(previousUrl ? { outputUrl: previousUrl } : {}),
          ...(previous.data.outputKind ? { outputKind: previous.data.outputKind } : {}),
          lastJobId: previous.data.lastJobId,
          ...(previous.data.lastCostUsd !== undefined ? { lastCostUsd: previous.data.lastCostUsd } : {}),
          ...(previous.data.lastError ? { lastError: previous.data.lastError } : {}),
        },
      };
    }
    if (isNewerJob(node.data.lastJobId, previous.data.lastJobId)) {
      if (!incomingUrl && previousUrl) {
        const clearedAt = node.data.outputClearedAt;
        if (!(clearedAt && clearedAt !== previous.data.outputClearedAt)) {
          return {
            ...node,
            data: {
              ...node.data,
              outputUrl: previousUrl,
              ...(previous.data.outputKind && !node.data.outputKind
                ? { outputKind: previous.data.outputKind }
                : {}),
            },
          };
        }
      }
      return node;
    }
    const incomingBusy = node.data.status === "queued" || node.data.status === "running";
    const previousDone = previous.data.status === "completed" && Boolean(previousUrl);
    // Same job, but the canvas tab still has the previous file. Do not save that over the rerun.
    if (previousDone && incomingUrl && incomingUrl !== previousUrl) {
      return {
        ...node,
        data: {
          ...node.data,
          status: "completed",
          outputUrl: previousUrl,
          ...(previous.data.outputKind ? { outputKind: previous.data.outputKind } : {}),
          ...(previous.data.lastJobId ? { lastJobId: previous.data.lastJobId } : {}),
          lastError: undefined,
        },
      };
    }
    if (previousDone && incomingBusy) {
      return {
        ...node,
        data: {
          ...node.data,
          status: "completed",
          outputUrl: previousUrl,
          ...(previous.data.outputKind ? { outputKind: previous.data.outputKind } : {}),
          ...(previous.data.lastJobId ? { lastJobId: previous.data.lastJobId } : {}),
          lastError: undefined,
          ...(previous.data.lastCostUsd !== undefined ? { lastCostUsd: previous.data.lastCostUsd } : {}),
        },
      };
    }
    if (!previousUrl || incomingUrl) return node;
    // A new clear stamp means the client cleared this preview on purpose.
    const clearedAt = node.data.outputClearedAt;
    if (clearedAt && clearedAt !== previous.data.outputClearedAt) return node;
    return {
      ...node,
      data: {
        ...node.data,
        outputUrl: previousUrl,
        ...(previous.data.outputKind && !node.data.outputKind
          ? { outputKind: previous.data.outputKind }
          : {}),
      },
    };
  });
}

// Fills model nodes whose outputUrl was wiped, using the newest completed job.
export function applyCompletedJobOutputs(
  nodes: readonly CanvasNode[],
  jobs: readonly CompletedCanvasOutput[],
): CanvasNode[] {
  const latestByNodeId = new Map<string, CompletedCanvasOutput>();
  for (const job of jobs) {
    const url = job.outputUrl?.trim();
    if (!url) continue;
    const previous = latestByNodeId.get(job.nodeId);
    if (
      !previous ||
      job.updatedAt.getTime() >= previous.updatedAt.getTime()
    ) {
      latestByNodeId.set(job.nodeId, { ...job, outputUrl: url });
    }
  }

  let changed = false;
  const next = nodes.map((node): CanvasNode => {
    if (node.type !== "model" || node.data.outputUrl?.trim()) return node;
    const job = latestByNodeId.get(node.id);
    if (!job?.outputUrl) return node;
    // Outputs from before an input change belong to the old inputs.
    const clearedAt = node.data.outputClearedAt ? Date.parse(node.data.outputClearedAt) : NaN;
    if (Number.isFinite(clearedAt) && job.updatedAt.getTime() <= clearedAt) return node;
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        outputUrl: job.outputUrl,
        ...(job.outputKind ? { outputKind: job.outputKind } : {}),
        status: "completed",
        lastError: undefined,
      },
    };
  });
  return changed ? next : [...nodes];
}

// ObjectId's first 4 bytes are a unix timestamp, so job ids sort by when they were created.
function jobTime(id: string | undefined): number {
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) return 0;
  return Number.parseInt(id.slice(0, 8), 16);
}

export function isNewerJob(nextId: string | undefined, previousId: string | undefined): boolean {
  const next = jobTime(nextId);
  const previous = jobTime(previousId);
  return next > 0 && next > previous;
}

// True when `nextClearedAt` is a newer explicit clear stamp than `previousClearedAt`.
function isNewerClearStamp(
  nextClearedAt: string | undefined,
  previousClearedAt: string | undefined,
): boolean {
  if (!nextClearedAt || nextClearedAt === previousClearedAt) return false;
  if (!previousClearedAt) return true;
  const nextTime = Date.parse(nextClearedAt);
  const prevTime = Date.parse(previousClearedAt);
  if (Number.isFinite(nextTime) && Number.isFinite(prevTime)) return nextTime > prevTime;
  return nextClearedAt > previousClearedAt;
}

// The save response is the file that survived the merge. Paint it when this tab still
// has the previous clip, unless this tab has already started a newer job or cleared the preview.
export function adoptServerPreview<N extends { data: CanvasNodeData }>(
  local: N,
  server: { data: CanvasNodeData } | undefined,
): N {
  if (!server) return local;
  const serverUrl = server.data.outputUrl?.trim();
  if (!serverUrl || serverUrl === local.data.outputUrl?.trim()) return local;
  if (isNewerClearStamp(local.data.outputClearedAt, server.data.outputClearedAt)) return local;
  if (isNewerJob(local.data.lastJobId, server.data.lastJobId)) return local;
  const data: CanvasNodeData = {
    ...local.data,
    outputUrl: serverUrl,
    ...(server.data.outputKind ? { outputKind: server.data.outputKind } : {}),
    ...(server.data.status ? { status: server.data.status } : {}),
    ...(server.data.lastJobId ? { lastJobId: server.data.lastJobId } : {}),
    lastError: server.data.lastError,
  };
  if (server.data.staleOutputUrl) data.staleOutputUrl = server.data.staleOutputUrl;
  else delete data.staleOutputUrl;
  return { ...local, data };
}

export type CompletedNodeJob = {
  id: string;
  nodeId: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  chargedUsd?: number;
};

// A finished job is the file the card should show. A node left on Running, or a finished
// node whose autosave put the previous file back, is restored to that job's file.
export function restoreBusyNodesFromCompletedJobs<N extends { id: string; type: string; data: CanvasNodeData }>(
  nodes: readonly N[],
  jobs: readonly CompletedNodeJob[],
): { nodes: N[]; restoredIds: string[] } {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const restoredIds: string[] = [];
  const next = nodes.map((node) => {
    const jobId = node.data.lastJobId;
    if (node.type !== "model" || !jobId) return node;
    const job = byId.get(jobId);
    const outputUrl = job?.outputUrl?.trim();
    if (!job || job.nodeId !== node.id || !outputUrl) return node;
    const busy = node.data.status === "queued" || node.data.status === "running";
    const completed = node.data.status === "completed";
    if (!busy && !completed) return node;
    if (completed && node.data.outputUrl?.trim() === outputUrl) return node;
    restoredIds.push(node.id);
    const data: CanvasNodeData = {
      ...node.data,
      status: "completed",
      outputUrl,
      ...(job.outputKind ? { outputKind: job.outputKind } : {}),
      ...(job.chargedUsd !== undefined ? { lastCostUsd: job.chargedUsd } : {}),
      lastError: undefined,
    };
    if (data.staleOutputUrl && data.staleOutputUrl !== outputUrl) delete data.staleOutputUrl;
    return { ...node, data };
  });
  return { nodes: restoredIds.length > 0 ? next : [...nodes], restoredIds };
}

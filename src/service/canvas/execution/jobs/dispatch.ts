// Sends a queued canvas job to the provider that owns its model.
// Callers keep importing dispatchQueuedCanvasJobById from "@/service/canvas/execution/executor".
// Provider-specific requests live in execution/providers/.

import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob, CanvasNode } from "@/model/canvas";
import { markJobFailed } from "@/service/canvas/execution/job-ledger";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  resolveDeps,
  toErrorMessage,
  type CanvasExecutorDeps,
  type SubmitCanvasNodeJobResult,
} from "@/service/canvas/execution/jobs/deps";
import { settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import { dispatchAdapterFor } from "@/service/canvas/execution/providers";

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

// Hands the job to its provider adapter. Any thrown error fails the job and refunds it once.
export async function executeDispatchedCanvasJob(
  ctx: {
    initialJob: CanvasJob;
    spec: CanvasModelSpec;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
    presetId: string;
  },
  resolved: CanvasExecutorDeps,
): Promise<SubmitCanvasNodeJobResult> {
  const { initialJob, spec } = ctx;
  const clerkUserId = initialJob.clerkUserId;

  try {
    return await dispatchAdapterFor(spec.provider).dispatch({
      ...ctx,
      clerkUserId,
      canvasIdHex: initialJob.canvasId.toHexString(),
      jobIdHex: initialJob._id.toHexString(),
      resolved,
    });
  } catch (error) {
    const message = toErrorMessage(error, "模型執行失敗，已自動退還 USD Credit");
    const failedJob = await markJobFailed(initialJob, message, resolved);
    const creditUsd = await resolved.getUserCreditUsd(clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      error: message,
      job: failedJob,
      creditUsd,
    };
  }
}

// Submits a fused FFmpeg chain: one queued job per node, but only the head job starts a worker,
// and that worker renders every step in order (see executeCanvasFfmpegJob).

import type { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob } from "@/model/canvas";
import { submitCanvasNodeJob } from "@/service/canvas/execution/executor";
import { scheduleCanvasNodeWorkerTask } from "@/service/worker/schedule";

export type FusedChainSubmitDeps = {
  submit: typeof submitCanvasNodeJob;
  linkFollowers: (headJobId: ObjectId, followerJobIds: string[]) => Promise<void>;
  startWorker: (headJobId: ObjectId) => Promise<void> | void;
};

export type FusedChainSubmitResult =
  | { ok: true; jobs: CanvasJob[] }
  | { ok: false; error: string; job?: CanvasJob };

function defaultDeps(): FusedChainSubmitDeps {
  return {
    submit: submitCanvasNodeJob,
    linkFollowers: async (headJobId, followerJobIds) => {
      const col = await canvasJobsCollection();
      await col.updateOne({ _id: headJobId }, { $set: { fusedJobIds: followerJobIds, updatedAt: new Date() } });
    },
    startWorker: (headJobId) => scheduleCanvasNodeWorkerTask(headJobId),
  };
}

// The chain stops at the first follower that cannot be queued; that node runs alone in its own wave.
export async function submitFusedChain(
  input: { clerkUserId: string; canvasId: string; flowRunId: string; nodeIds: string[] },
  deps?: Partial<FusedChainSubmitDeps>,
): Promise<FusedChainSubmitResult> {
  const resolved = { ...defaultDeps(), ...deps };
  const [headId, ...followerIds] = input.nodeIds;
  if (!headId) return { ok: false, error: "沒有可執行的節點" };
  const base = { clerkUserId: input.clerkUserId, canvasId: input.canvasId, flowRunId: input.flowRunId };

  const head = await resolved.submit({ ...base, nodeId: headId, deferWorker: true });
  if (!head.ok) return { ok: false, error: head.error, ...(head.job ? { job: head.job } : {}) };
  const headJobId = head.job._id;

  const followers: CanvasJob[] = [];
  for (let i = 0; i < followerIds.length; i += 1) {
    const res = await resolved.submit({
      ...base,
      nodeId: followerIds[i]!,
      deferWorker: true,
      fusedUpstream: input.nodeIds.slice(0, i + 1),
      fusedIntoJobId: headJobId.toHexString(),
    });
    if (!res.ok || res.job.status !== "queued") break;
    followers.push(res.job);
  }

  if (followers.length > 0) {
    await resolved.linkFollowers(headJobId, followers.map((j) => j._id.toHexString()));
  }
  await resolved.startWorker(headJobId);
  return { ok: true, jobs: [head.job, ...followers] };
}

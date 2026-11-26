// Re-attaches canvas jobs and running flows that never got a worker task.
// The generic queue calls this; it does not query canvas collections itself.

import { canvasJobsCollection, canvasProjectsCollection } from "@/dao";
import type { EnqueueWorkerTaskInput } from "@/service/worker/task-queue";

export async function recoverCanvasWorkerTasks(
  limit: number,
  enqueue: (input: EnqueueWorkerTaskInput) => Promise<unknown>,
): Promise<number> {
  const [canvasJobsCol, canvasProjectsCol] = await Promise.all([
    canvasJobsCollection(),
    canvasProjectsCollection(),
  ]);
  const [activeCanvasJobs, activeCanvasFlows] = await Promise.all([
    canvasJobsCol
      .find({ status: { $in: ["queued", "running"] } })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .toArray(),
    canvasProjectsCol
      .find({ "activeFlowRun.status": "running", "activeFlowRun.aborted": { $ne: true } })
      .limit(limit)
      .toArray(),
  ]);

  let enqueued = 0;
  for (const job of activeCanvasJobs) {
    if (!job._id) continue;
    await enqueue({ kind: "canvas_node", targetId: job._id, lane: "cpu" });
    enqueued += 1;
  }
  for (const project of activeCanvasFlows) {
    const run = project.activeFlowRun;
    if (!project._id || !run?.flowRunId) continue;
    await enqueue({
      kind: "canvas_flow",
      targetId: project._id,
      lane: "cpu",
      dedupeKey: `canvas_flow:${run.flowRunId}`,
      payload: { flowRunId: run.flowRunId, clerkUserId: project.clerkUserId },
    });
    enqueued += 1;
  }
  return enqueued;
}

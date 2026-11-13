import { drainPendingJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";
import { resumeStalePhaseAJobs } from "@/service/director/jobs";
import {
  shouldUseWorkerQueueOnly,
  syncPendingDomainJobsToWorkerQueue,
} from "@/service/worker/task-queue";

// Every minute: send due pending generation jobs to the configured provider,
// or sync domain jobs into `workerTasks` when Vast Worker mode is enabled.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  if (shouldUseWorkerQueueOnly()) {
    const synced = await syncPendingDomainJobsToWorkerQueue();
    return Response.json({ workerQueueOnly: true, ...synced });
  }
  const phaseA = await resumeStalePhaseAJobs();
  const result = await drainPendingJobs();
  return Response.json({ ...result, phaseA });
}

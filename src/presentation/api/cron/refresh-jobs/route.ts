import { refreshSubmittedJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";
import { advanceExtendJobs } from "@/service/extend/pipeline";
import { advanceJutsuJobs } from "@/service/jutsu/pipeline";
import { advanceTeleportJobs } from "@/service/teleport/pipeline";
import {
  shouldUseWorkerQueueOnly,
  syncPendingDomainJobsToWorkerQueue,
} from "@/service/worker/task-queue";

// Every minute: pull provider results and time out stuck jobs,
// or sync domain jobs into `workerTasks` when Vast Worker mode is enabled.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  if (shouldUseWorkerQueueOnly()) {
    const synced = await syncPendingDomainJobsToWorkerQueue();
    return Response.json({ workerQueueOnly: true, ...synced });
  }
  const [result, swapAdvanced, teleportAdvanced, extendAdvanced] = await Promise.all([
    refreshSubmittedJobs(),
    advanceJutsuJobs().catch(() => 0),
    advanceTeleportJobs().catch(() => 0),
    advanceExtendJobs().catch(() => 0),
  ]);
  return Response.json({ ...result, swapAdvanced, teleportAdvanced, extendAdvanced });
}

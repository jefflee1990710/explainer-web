import {
  getWorkerQueueStats,
  syncPendingDomainJobsToWorkerQueue,
} from "@/service/worker/task-queue";
import { isWorkerRequestAuthorized } from "@/service/worker/worker-auth";

export async function GET(request: Request) {
  if (!isWorkerRequestAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("sync") === "1") {
    await syncPendingDomainJobsToWorkerQueue();
  }
  const stats = await getWorkerQueueStats();
  return Response.json({ ok: true, ...stats });
}

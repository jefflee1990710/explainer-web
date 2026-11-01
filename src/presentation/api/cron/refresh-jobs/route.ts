import { refreshSubmittedJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";
import { advanceJutsuJobs } from "@/service/jutsu/pipeline";

// Every minute: pull provider results and time out stuck jobs.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const [result, swapAdvanced] = await Promise.all([
    refreshSubmittedJobs(),
    advanceJutsuJobs().catch(() => 0),
  ]);
  return Response.json({ ...result, swapAdvanced });
}

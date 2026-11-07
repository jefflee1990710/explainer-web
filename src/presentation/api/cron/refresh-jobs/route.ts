import { refreshSubmittedJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";
import { advanceExtendJobs } from "@/service/extend/pipeline";
import { advanceJutsuJobs } from "@/service/jutsu/pipeline";
import { advanceTeleportJobs } from "@/service/teleport/pipeline";

// Every minute: pull provider results and time out stuck jobs.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const [result, swapAdvanced, teleportAdvanced, extendAdvanced] = await Promise.all([
    refreshSubmittedJobs(),
    advanceJutsuJobs().catch(() => 0),
    advanceTeleportJobs().catch(() => 0),
    advanceExtendJobs().catch(() => 0),
  ]);
  return Response.json({ ...result, swapAdvanced, teleportAdvanced, extendAdvanced });
}

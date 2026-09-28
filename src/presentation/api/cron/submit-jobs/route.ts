import { drainPendingJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";

// Every minute: send due pending generation jobs to Higgsfield.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await drainPendingJobs();
  return Response.json(result);
}

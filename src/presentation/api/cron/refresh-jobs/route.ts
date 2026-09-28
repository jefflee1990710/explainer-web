import { refreshSubmittedJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";

// Every minute: pull provider results and time out stuck jobs.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await refreshSubmittedJobs();
  return Response.json(result);
}

import { apiJson, withApiUser } from "@/service/api/respond";
import { advanceOwnedJobs } from "@/service/generation/task-advance";
import { listTasks } from "@/service/generation/task-list";

// Generation task queue. `?videoId=` limits to one video; `?advance=0` skips the
// provider status sweep (same contract as listTasksAction).
export const GET = withApiUser(async ({ auth, request }) => {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId") || undefined;
  const advance = url.searchParams.get("advance") !== "0";
  if (advance) {
    await advanceOwnedJobs(auth.user.clerkUserId).catch((error) => {
      console.error("[api/v1/tasks] advance failed", error);
    });
  }
  const tasks = await listTasks(auth.user.clerkUserId, { videoId });
  const active = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  return apiJson({ tasks, active });
});

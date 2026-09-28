import { listTasksAction, type TasksResult } from "@/presentation/actions/tasks";
import { rememberTasks } from "@/presentation/components/app/tasks/task-cache";

const inflight = new Map<string, Promise<TasksResult>>();

function cacheKey(videoId?: string) {
  return videoId || "*";
}

// One listTasks request per video at a time so the header meter and
// the dialog share the first response instead of stacking waits.
export function listTasksOnce(videoId?: string): Promise<TasksResult> {
  const key = cacheKey(videoId);
  const running = inflight.get(key);
  if (running) return running;
  const request = listTasksAction(videoId)
    .then((result) => {
      if (result.ok) rememberTasks(videoId, result.tasks);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

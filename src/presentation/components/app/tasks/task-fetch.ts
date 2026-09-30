import { listTasksAction, type TasksResult } from "@/presentation/actions/tasks";
import {
  mergeOptimisticTasks,
  pruneOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { rememberTasks } from "@/presentation/components/app/tasks/task-cache";

const inflight = new Map<string, Promise<TasksResult>>();

function cacheKey(videoId: string | undefined, advance: boolean) {
  return `${videoId || "*"}:${advance ? "advance" : "fast"}`;
}

// One listTasks request per video and mode at a time so the header meter and
// the dialog share the first response instead of stacking waits.
// `advance: false` is the click path: read the queue without provider polling.
export function listTasksOnce(videoId?: string, options?: { advance?: boolean }): Promise<TasksResult> {
  const advance = options?.advance !== false;
  const key = cacheKey(videoId, advance);
  const running = inflight.get(key);
  if (running) return running;
  const request = listTasksAction(videoId, advance)
    .then((result) => {
      if (!result.ok) return result;
      const held = pruneOptimisticTasks(result.tasks, videoId);
      const tasks = mergeOptimisticTasks(result.tasks, held);
      rememberTasks(videoId, tasks);
      return { ok: true as const, tasks };
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

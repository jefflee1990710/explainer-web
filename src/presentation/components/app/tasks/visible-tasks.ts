import type { PublicTask } from "@/service/generation/task-list";

const RECENT_DONE = 5;

function isActive(task: PublicTask) {
  return task.stage !== "done" && task.stage !== "failed";
}

// In-flight tasks stay. Finished ones (done or failed) keep only the newest few.
export function visibleTasks(tasks: PublicTask[], recentDone = RECENT_DONE) {
  const active = tasks.filter(isActive);
  const finished = tasks
    .filter((task) => !isActive(task))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, recentDone);
  return [...active, ...finished];
}

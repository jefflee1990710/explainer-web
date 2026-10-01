import type { PublicTask } from "@/service/generation/task-list";

function active(task: PublicTask) {
  return task.stage !== "done" && task.stage !== "failed";
}

// Videos whose background job just finished between two task-list snapshots.
// Optimistic rows use a different id than the real job, so a video that had
// any in-flight row and now only has finished rows counts too.
export function settledVideoIds(prev: PublicTask[], next: PublicTask[]): string[] {
  const prevById = new Map(prev.map((task) => [task.id, task]));
  const ids = new Set<string>();

  for (const task of next) {
    if (!task.videoId) continue;
    if (active(task)) continue;
    const before = prevById.get(task.id);
    if (before && active(before)) ids.add(task.videoId);
  }

  const stillActive = new Set(
    next.filter((task) => task.videoId && active(task)).map((task) => task.videoId),
  );
  for (const task of prev) {
    if (!task.videoId || !active(task) || stillActive.has(task.videoId)) continue;
    const finished = next.some((item) => item.videoId === task.videoId && !active(item));
    if (finished) ids.add(task.videoId);
  }

  return [...ids];
}

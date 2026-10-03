import type { PublicTask } from "@/service/generation/task-list";
import { folderVideoMatchesTask } from "@/service/folder-video-path";

const cache = new Map<string, PublicTask[]>();

function cacheKey(videoId?: string) {
  return videoId || "*";
}

// Last successful listTasks fetch; the editor dialog reads this so it
// does not spin while a second request is in flight.
export function rememberTasks(videoId: string | undefined, tasks: PublicTask[]) {
  cache.set(cacheKey(videoId), tasks);
}

export function readCachedTasks(videoId?: string): PublicTask[] | undefined {
  const exact = cache.get(cacheKey(videoId));
  if (exact) return exact;
  if (!videoId) return undefined;
  // Header meter already fetched the global list — paint this video's rows now.
  const all = cache.get("*");
  if (!all) return undefined;
  return all.filter((task) => folderVideoMatchesTask(task.href, videoId));
}

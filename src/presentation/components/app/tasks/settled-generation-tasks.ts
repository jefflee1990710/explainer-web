import type { PublicTask } from "@/service/generation/task-list";

const MEDIA_KINDS = new Set<PublicTask["kind"]>(["frame", "still", "video", "character"]);
const FRESH_MS = 20_000;

function active(task: PublicTask) {
  return task.stage !== "done" && task.stage !== "failed";
}

function isMedia(task: PublicTask) {
  return MEDIA_KINDS.has(task.kind);
}

// Image and video jobs that just left the queue. A finished job that replaces
// an optimistic row has a new id, so a fresh timestamp on that video counts too.
export function settledGenerationTasks(prev: PublicTask[], next: PublicTask[], now = Date.now()): PublicTask[] {
  const prevById = new Map(prev.map((task) => [task.id, task]));
  const prevActiveVideos = new Set(
    prev.filter((task) => task.videoId && active(task)).map((task) => task.videoId),
  );
  const out: PublicTask[] = [];
  for (const task of next) {
    if (!isMedia(task) || active(task)) continue;
    const before = prevById.get(task.id);
    const wasActive = Boolean(before && active(before));
    const fresh = now - Date.parse(task.updatedAt) < FRESH_MS;
    const replacedOptimistic = !before && Boolean(task.videoId && prevActiveVideos.has(task.videoId) && fresh);
    if (wasActive || replacedOptimistic) out.push(task);
  }
  return out;
}

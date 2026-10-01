import type { PublicTask } from "@/service/generation/task-list";

const OPTIMISTIC_PREFIX = "optimistic:";

// Click → queued row, before Mongo has the job. Dropped once a matching
// active server task shows up in listTasks.
const store = new Map<string, PublicTask>();
let sequence = 0;

const VIDEO_KEY = /^video:(\d+)$/;
const FRAMES_KEY = /^frames:(\d+)$/;
const FRAME_KEY = /^frame:(\d+):(start|end)$/;
const REGEN_KEY = /^clip:(\d+):regen$/;

function hrefFor(projectId: string, videoId: string) {
  return `/app/projects/${projectId}?video=${videoId}`;
}

function queuedRow(input: {
  videoId: string;
  projectId: string;
  title: string;
  now: string;
  clipNumber: number;
  position: "video" | "start" | "end";
}): PublicTask {
  const n = input.clipNumber;
  const detail =
    input.position === "video"
      ? `Clip ${n} · 影片`
      : `Clip ${n} · ${input.position === "end" ? "結尾畫格" : "起始畫格"}`;
  const detailKey =
    input.position === "video"
      ? "tasksPage.detail.clipVideo"
      : input.position === "end"
        ? "tasksPage.detail.clipFrameEnd"
        : "tasksPage.detail.clipFrameStart";
  const kind = input.position === "video" ? "video" : "frame";
  sequence += 1;
  return {
    id: `${OPTIMISTIC_PREFIX}${sequence}:${detail}`,
    kind,
    stage: "queued",
    title: input.title,
    detail,
    detailKey,
    detailParams: { n },
    isVideo: kind === "video",
    href: hrefFor(input.projectId, input.videoId),
    attempts: 0,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

// Paid-button keys that enqueue generation jobs. Save-only keys yield nothing.
export function paidKeyTasks(input: {
  videoId: string;
  projectId: string;
  title: string;
  keys: string[];
  now?: string;
}): PublicTask[] {
  const now = input.now ?? new Date().toISOString();
  const tasks: PublicTask[] = [];
  for (const key of input.keys) {
    const video = VIDEO_KEY.exec(key);
    if (video) {
      tasks.push(queuedRow({ ...input, now, clipNumber: Number(video[1]), position: "video" }));
      continue;
    }
    const frames = FRAMES_KEY.exec(key);
    const regen = REGEN_KEY.exec(key);
    const clipNumber = frames ? Number(frames[1]) : regen ? Number(regen[1]) : 0;
    if (clipNumber) {
      tasks.push(queuedRow({ ...input, now, clipNumber, position: "start" }));
      tasks.push(queuedRow({ ...input, now, clipNumber, position: "end" }));
      continue;
    }
    const frame = FRAME_KEY.exec(key);
    if (frame) {
      tasks.push(
        queuedRow({
          ...input,
          now,
          clipNumber: Number(frame[1]),
          position: frame[2] === "end" ? "end" : "start",
        }),
      );
    }
  }
  return tasks;
}

function isActiveMatch(server: PublicTask[], optimistic: PublicTask) {
  return server.some(
    (task) =>
      !task.id.startsWith(OPTIMISTIC_PREFIX) &&
      task.stage !== "done" &&
      task.stage !== "failed" &&
      task.kind === optimistic.kind &&
      task.detail === optimistic.detail &&
      task.href === optimistic.href,
  );
}

// Keep click-time rows that the server list has not caught up to yet.
export function mergeOptimisticTasks(server: PublicTask[], optimistic: PublicTask[]) {
  const pending = optimistic.filter((task) => !isActiveMatch(server, task));
  const rest = server.filter((task) => !task.id.startsWith(OPTIMISTIC_PREFIX));
  return [...pending, ...rest];
}

export function holdOptimisticTasks(tasks: PublicTask[]) {
  for (const task of tasks) store.set(task.id, task);
  return tasks.map((task) => task.id);
}

export function readOptimisticTasks(videoId?: string) {
  const tasks = [...store.values()];
  if (!videoId) return tasks;
  const needle = `video=${videoId}`;
  return tasks.filter((task) => task.href.includes(needle));
}

export function releaseOptimisticTasks(ids: string[]) {
  for (const id of ids) store.delete(id);
}

// Remove holds the server list already represents. Returns what is still pending.
export function pruneOptimisticTasks(server: PublicTask[], videoId?: string) {
  const remaining: PublicTask[] = [];
  for (const task of readOptimisticTasks(videoId)) {
    if (isActiveMatch(server, task)) store.delete(task.id);
    else remaining.push(task);
  }
  return remaining;
}

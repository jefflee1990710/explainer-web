import type { PublicTask } from "@/service/generation/task-list";

// Client-side "tasks changed" signal. Fired after a job is queued or settles
// so every task meter / list refetches now instead of on its next 5 s tick.
const listeners = new Set<() => void>();

export function subscribeTaskChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyTasksChanged() {
  for (const listener of listeners) listener();
}

// Fired when a video's background job just settled, so the open editor can
// load the new frame or clip instead of keeping the picture it opened with.
const projectListeners = new Set<(videoId: string) => void>();

export function subscribeProjectRefresh(listener: (videoId: string) => void) {
  projectListeners.add(listener);
  return () => {
    projectListeners.delete(listener);
  };
}

export function notifyProjectRefresh(videoId: string) {
  for (const listener of projectListeners) listener(videoId);
}

// Image / video jobs that just finished. The notifier dedupes by task id
// because more than one poller can report the same snapshot.
const generationListeners = new Set<(tasks: PublicTask[]) => void>();

export function subscribeGenerationSettled(listener: (tasks: PublicTask[]) => void) {
  generationListeners.add(listener);
  return () => {
    generationListeners.delete(listener);
  };
}

export function notifyGenerationSettled(tasks: PublicTask[]) {
  if (tasks.length === 0) return;
  for (const listener of generationListeners) listener(tasks);
}

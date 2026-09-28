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

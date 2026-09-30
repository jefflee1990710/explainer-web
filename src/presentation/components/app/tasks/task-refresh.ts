// True from the moment a paid generate click lands until that click's
// follow-up task fetch is allowed to finish. Meters show a spinner on this.
let depth = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function beginTaskRefresh() {
  depth += 1;
  emit();
}

export function endTaskRefresh() {
  depth = Math.max(0, depth - 1);
  emit();
}

export function isTaskRefreshing() {
  return depth > 0;
}

export function subscribeTaskRefresh(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

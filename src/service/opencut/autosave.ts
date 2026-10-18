// Debounce before an OpenCut timeline edit is written back to the server.
export const OPENCUT_AUTOSAVE_DELAY_MS = 200;

export type AutosaveQueue<T> = {
	busy: boolean;
	pending: T | null;
};

/** Start a save, or keep only the latest edit while one is already running. */
export function beginAutosave<T>(queue: AutosaveQueue<T>, next: T) {
	if (queue.busy) {
		return { queue: { busy: true, pending: next }, run: null as T | null };
	}
	return { queue: { busy: true, pending: null }, run: next };
}

/** After a save finishes, run the queued edit or clear the indicator. */
export function finishAutosave<T>(queue: AutosaveQueue<T>) {
	if (queue.pending != null) {
		return { queue: { busy: true, pending: null }, run: queue.pending };
	}
	return { queue: { busy: false, pending: null }, run: null as T | null };
}

// Keep extra room-tone the detector already cut, so talking-head cuts still breathe.
export const SMOOTH_SILENCE_HEAD_KEEP_SECONDS = 0.22;
export const SMOOTH_SILENCE_TAIL_KEEP_SECONDS = 0.32;
export const SMOOTH_SILENCE_GAP_SECONDS = 0.18;
const MIN_VISIBLE_SECONDS = 0.5;

export type SmoothSilenceBounds = {
	duration: number;
	trimStart: number;
	trimEnd: number;
};

// Soften a stored speech trim so the clip keeps a natural pre/post breath.
export function naturalSpeechTrim(bounds: SmoothSilenceBounds): {
	trimStart: number;
	trimEnd: number;
	visible: number;
} {
	const duration = Math.max(0, bounds.duration);
	const trimStart = Math.max(
		0,
		Math.min(duration - MIN_VISIBLE_SECONDS, bounds.trimStart - SMOOTH_SILENCE_HEAD_KEEP_SECONDS),
	);
	const trimEnd = Math.max(
		0,
		Math.min(
			duration - trimStart - MIN_VISIBLE_SECONDS,
			bounds.trimEnd - SMOOTH_SILENCE_TAIL_KEEP_SECONDS,
		),
	);
	const roundedStart = Math.round(trimStart * 1000) / 1000;
	const roundedEnd = Math.round(trimEnd * 1000) / 1000;
	const visible = Math.max(
		MIN_VISIBLE_SECONDS,
		Math.round((duration - roundedStart - roundedEnd) * 1000) / 1000,
	);
	return { trimStart: roundedStart, trimEnd: roundedEnd, visible };
}

// Advance the pack cursor. Leave a short gap after every clip except the last.
export function nextPackedStartSeconds(
	cursorSeconds: number,
	visibleSeconds: number,
	isLast: boolean,
): number {
	return cursorSeconds + visibleSeconds + (isLast ? 0 : SMOOTH_SILENCE_GAP_SECONDS);
}

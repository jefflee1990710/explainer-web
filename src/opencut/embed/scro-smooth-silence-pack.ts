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

// Pure decision rule: talking-head videos auto-enable Smooth Silence once a clip video is generated,
// unless the user has manually toggled the switch on or off for this video.
export function shouldAutoEnableSmoothSilence({
	isTalkingHead,
	hasGeneratedVideo,
	userOverride,
}: {
	isTalkingHead: boolean;
	hasGeneratedVideo: boolean;
	userOverride?: boolean;
}): boolean {
	if (userOverride !== undefined) return userOverride;
	if (!hasGeneratedVideo) return false;
	return isTalkingHead;
}

let currentVideoId: string | null = null;
let smoothSilenceEnabled = false;
const userOverridesByVideoId = new Map<string, boolean>();
const listeners = new Set<() => void>();

function emitSmoothSilence() {
	for (const listener of listeners) listener();
}

export function subscribeScroSmoothSilence(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getScroSmoothSilenceEnabled(): boolean {
	return smoothSilenceEnabled;
}

export function getScroSmoothSilenceUserOverride(
	videoId?: string | null,
): boolean | undefined {
	if (!videoId) return undefined;
	return userOverridesByVideoId.get(videoId);
}

// Update Smooth Silence state. When userInitiated is true, record the manual choice for this videoId.
export function setScroSmoothSilenceEnabled(
	next: boolean,
	options?: { videoId?: string | null; userInitiated?: boolean },
): void {
	const targetVideoId = options?.videoId ?? currentVideoId;
	if (targetVideoId) {
		currentVideoId = targetVideoId;
		if (options?.userInitiated) {
			userOverridesByVideoId.set(targetVideoId, next);
		}
	}
	if (smoothSilenceEnabled === next) return;
	smoothSilenceEnabled = next;
	emitSmoothSilence();
}

// Sync Smooth Silence state for the active project and report whether it just auto-turned on.
export function syncAutoSmoothSilence({
	videoId,
	isTalkingHead,
	hasGeneratedVideo,
}: {
	videoId?: string | null;
	isTalkingHead: boolean;
	hasGeneratedVideo: boolean;
}): { enabled: boolean; autoTurnedOn: boolean } {
	if (videoId) currentVideoId = videoId;
	const userOverride = videoId ? userOverridesByVideoId.get(videoId) : undefined;
	const next = shouldAutoEnableSmoothSilence({
		isTalkingHead,
		hasGeneratedVideo,
		userOverride,
	});
	const autoTurnedOn =
		userOverride === undefined && isTalkingHead && hasGeneratedVideo && !smoothSilenceEnabled && next;
	if (smoothSilenceEnabled !== next) {
		smoothSilenceEnabled = next;
		emitSmoothSilence();
	}
	return { enabled: next, autoTurnedOn };
}

export function resetScroSmoothSilenceForTest(): void {
	currentVideoId = null;
	smoothSilenceEnabled = false;
	userOverridesByVideoId.clear();
	emitSmoothSilence();
}

